import React from 'react';

import { Database } from '../Database';
import { Table , Pagination, Form, Icon, Message, Button} from 'semantic-ui-react';
import { Modal } from 'react-bootstrap';
import AppContext from './../module/AppContext';

const aggregationMethod = ['avg' , 'sum']

function EditFormula(props){
    const { show , onHide , name , formula , id , columns , names , refresh } = props;
    const [ editName , setEditName ] = React.useState('');
    const [ editFormula , setEditFormula ] = React.useState('')
    const [ counters , setCounters ] = React.useState([])
    const [ formulaCorrect , setFormulaCorrect ] = React.useState(false);
    const [ nameCorrect , setNameCorrect ] = React.useState('Name is empty')
    const appContext = React.useContext(AppContext)

    const verifyFomula = (_formula, _columns) => {
        let removeAgg = _formula; 
        _columns.forEach(col => {
            let regex = RegExp(`(${aggregationMethod.join("|")})\\(\\s*${col.counter}\\s*\\)`,'g')
            removeAgg = removeAgg.replace(regex , "1")
        })

        try{
            eval(removeAgg)
            setFormulaCorrect(true)
        }catch(err){
            setFormulaCorrect(false)
        }
    }

    React.useEffect(()=>{
        // console.log(columns)
        if(show && !!name && !!formula && !!columns){
            
            setEditName(name)
            if(name.trim() === ''){
                setNameCorrect("Name is empty")
            }else if(names.includes(name.trim())){
                setNameCorrect("Name exist")
            }else{
                setNameCorrect(null)
            }

            setEditFormula(formula)
            setCounters(columns.filter(col => formula.match(col.counter)).map(col => col.counter))
            verifyFomula(formula, columns)
        }

        return () => {
            if(!show){
                setEditName('')
                setEditFormula('')
                setCounters([])
                setNameCorrect('Name is empty')
                setFormulaCorrect(false)
            }
        }
    },[show , name , formula , columns])

    return <Modal show={show} onHide={onHide} centered>
        <Modal.Header>
            <h4>{id === null ? 'Create formula' : 'Edit formula'}</h4>
        </Modal.Header>
        <Modal.Body>
            <Form error success>
                <Form.Group widths="equal">
                    <Form.Input label="Name" type="text" placeholder="Enter name" value={editName} onChange={(e, {value})=>{
                        setEditName(value)  
                        
                        // verify the name
                        if(value.trim() === ''){
                            setNameCorrect("Name is empty")
                        }else if(names.includes(value.trim())){
                            setNameCorrect("Name exist")
                        }else{
                            setNameCorrect(null)
                        }
                    }}/>
                </Form.Group>
                {nameCorrect !== null && <Message error header={nameCorrect} />}
                <Form.Group widths="equal">
                    <Form.TextArea rows={3} label="Formula" type="text" placeholder="Enter formula" value={editFormula} onChange={(e, {value})=>{
                        setEditFormula(value)
                        console.log(columns.filter(col => value.match(col.counter)).map(col => col.counter))
                        setCounters(columns.filter(col => value.match(col.counter)).map(col => col.counter))

                        // verify the formula
                        verifyFomula(value , columns)
                    }}/>
                </Form.Group>
                {formulaCorrect && <Message success header='Formula correct' />}
                {!formulaCorrect && <Message error header='Formula incorrect' />}
                <Form.Select label="Counter" selection multiple search value={counters} options={columns.map(counter => ({key:counter.counter,value:counter.counter,text:counter.counter, tablename:counter.tablename}))} onChange={(e,{value, tablename})=>{
                    console.log(tablename)
                    value.forEach(val => {
                        if(!counters.includes(val)){
                            setEditFormula(editFormula + ` ${val}`)
                        }
                    })

                    setCounters(value)
                }}/>
                <Form.Select label="Table" selection disabled multiple 
                    value={Array.from(new Set(columns.filter(col => counters.includes(col.counter)).map(col => col.tablename)))}
                    options={appContext.main.filter(table => appContext.tables.includes(table)).map(table => ({key:table,value:table,text:table}))}
                />
            </Form>
        </Modal.Body>
        <Modal.Footer>
                <Button primary disabled={nameCorrect !== null || !formulaCorrect} onClick={()=>{
                    let dependancyTables = Array.from(new Set(columns.filter(col => counters.includes(col.counter)).map(col => col.tablename)))

                    if(id === null){
                        let db = new Database()
                        db.update(`INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ('${editName}' , '${editFormula}' , '${dependancyTables.join(";")}' , ${dependancyTables.length > 1 ? 0 : 1} )`).then((response)=>{
                            if(response.status === 'Ok'){
                                refresh()
                                onHide()
                            }else{
                                console.log("Error when update formula")
                            }
                        })
                    }else{
                        let db = new Database()
                        db.update(`UPDATE formulas SET name = '${editName}' , formula = '${editFormula}' , tablename = '${dependancyTables.join(";")}' , singletable = ${dependancyTables.length > 1 ? 0 : 1} WHERE ID = ${id}`).then((response)=>{
                            if(response.status === 'Ok'){
                                refresh()
                                onHide()
                            }else{
                                console.log("Error when update formula")
                            }
                        })
                    }
                    
                }}>{id === null ? 'Create' : 'Save'} </Button>
        </Modal.Footer>
    </Modal>
}

function KPIList(props){
    const { title , setTitle  } = props 
    const [ formulaList , setFormulaList ] = React.useState([])
    const [ activePage , setActivePage ] = React.useState(0)
    const [ filter , setFilter ] = React.useState('')
    const [ columns , setColumns ] = React.useState([])
    const [ editing , setEditing ] = React.useState({
        show: false, 
        formula: '',
        name: '',
        id: null, 
        names: []
    })
    const appContext = React.useContext(AppContext)

    const itemPerPage = 10
    React.useEffect(()=>{
        setTitle(title)
    }, [title])

    const loadColumns = async () => {
        let queries = appContext.main.filter(table => appContext.tables.includes(table)).map(table => {
            return {
                table: table, 
                command: `SELECT name , type FROM pragma_table_info("${table}")`
            }
        })
        let _columns = []
        for(let i=0,q;q=queries[i];i++){
            let query = await new Database().query(q.command)
            if(query.status === 'Ok'){
                _columns.push(...query.result.filter(entry => entry.name !== 'ID' && entry.name !== appContext.objectDate.object && entry.name !== appContext.objectDate.date).map(entry => ({counter:entry.name, tablename:q.table})))
            }

        }

        setColumns(_columns)
    }

    const loadFormula = () => {
        const query  = new Database().query(`SELECT ID , name , formula FROM formulas`)
        query.then((response)=>{
            if(response.status === 'Ok'){
                setFormulaList(response.result)
            }else{
                throw Error("Unable to get formula list")
            }
        }).catch((error)=>{
            console.log(error)
        })
    }

    React.useEffect(()=>{
        loadColumns()
        loadFormula()
    },[appContext.tables])

    return <div style={{height:'calc( 100vh - 78px )', overflowY: 'auto'}}>
        <div style={{display: 'flex'}}>
            <Form>
                <Form.Input type="text" placeholder="Search" value={filter} onChange={(e,{value})=>{setFilter(value);setActivePage(0)}} />
            </Form>
            
            
            <div style={{flexGrow:1}}></div>
            <div style={{marginLeft: '4px'}}>
                <Button basic primary content="Create" icon="add" labelPosition="right" onClick={()=>{
                    setEditing({
                        show: true, 
                        name: '',
                        formula: '', 
                        id: null, 
                        names: formulaList.map(formula => formula.name)
                    })
                }}/>
            </div>
        </div>
        <Table size="small">
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell>Name</Table.HeaderCell>
                    <Table.HeaderCell>Fomula</Table.HeaderCell>
                    <Table.HeaderCell />
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {formulaList.filter(entry => {
                    let regex = new RegExp(filter.replace(/([\[\\\^\$\.\|\?\*\+\(\)])/g, "\\$1"), 'i')
                    return entry.name.match(regex)
                }).slice(activePage*itemPerPage,(activePage+1)*itemPerPage).map((formula,formulaid)=>(
                    <Table.Row key={formulaid}>
                        <Table.Cell>{formula.name}</Table.Cell>
                        <Table.Cell>{formula.formula}</Table.Cell>
                        <Table.Cell>
                            <div onClick={()=>{
                                setEditing({
                                    show: true, 
                                    name: formula.name,
                                    formula: formula.formula, 
                                    id: formula.ID, 
                                    names: formulaList.filter(_formula => _formula.ID !== formula.ID ).map(_formula => _formula.name)
                                })
                            }}>
                                <Icon name="edit" />
                            </div>
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
        <div style={{display: 'flex'}}>
            <div style={{flexGrow:1}}></div>
            <Pagination 
                activePage={activePage+1} 
                onPageChange={(e,{activePage})=>setActivePage(activePage-1)}
                totalPages={Math.floor(formulaList.filter(entry => {
                    let regex = new RegExp(filter.replace(/([\[\\\^\$\.\|\?\*\+\(\)])/g, "\\$1"), 'i')
                    return entry.name.match(regex)
                }).length/itemPerPage)}
            />
        </div>
        <EditFormula show={editing.show} names={editing.names} name={editing.name} formula={editing.formula} id={editing.id} onHide={()=>{
            setEditing({
                show: false , 
                name: '',
                formula: '',
                id: null,
                names: []
            })
        }} refresh={()=>loadFormula()} columns={columns} />
    </div>
}

export default KPIList