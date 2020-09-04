import React from 'react'
import { Database } from '../Database';
import { Message , Table, Icon, Button, Pagination, Form, Checkbox} from 'semantic-ui-react'; 
import { Modal } from 'react-bootstrap';

import AppContext from './../module/AppContext';

function AddNewColumn(props){
    const { show , onHide } = props
    const [ error , setError ] = React.useState(null)
    const [ inputName , setInputName ] = React.useState("")
    const [ convertName , setConvertName ] = React.useState("")
    const [ newType, setNewType ] = React.useState('REAL')

    React.useEffect(()=>{
        let _convertName = inputName.replace(/(^[\W(\d]+|\W+$)/g, "")
        _convertName = _convertName.replace(/-/g, "to")
        _convertName = _convertName.replace(/[\s\W]+/g, "_")
        setConvertName(_convertName)
    },[inputName])
    
    return <Modal show={show} onHide={onHide} centered>
        <Modal.Header>New column</Modal.Header>
        <Modal.Body>
            <Form>
                <Form.Input label="Excel column" type="text" placeholder="Excel column header" value={inputName} onChange={(e,{value})=>setInputName(value)} />
                <Form.Input label="Database column" type="text" placeholder="Database column" disabled={true} value={convertName} />
                <Form.Select label="Type" selection options={[
                    {key:'REAL', value:'REAL', text: 'Number'}, 
                    {key:'TEXT', value:'TEXT', text: 'Text'}, 
                    {key:'DATE', value:'DATE', text: 'Date'}
                ]} value={newType} onChange={(e,{value})=>setNewType(value)}/>
            </Form>
            {error !== null && <Message error header="Error" content={error} />}
        </Modal.Body>
        <Modal.Footer>
            <Button primary onClick={()=>{
                let addAction = new Database().query(`ALTER TABLE main ADD COLUMN ${convertName} TYPE ${newType}`)
                addAction.then((res)=>{
                    if(res.status === 'Ok'){
                        onHide(true)
                    }else{
                        throw Error("Unable to create new column")
                    }
                }).catch((error)=>{
                    setError(error.message)
                })
            }}>Add</Button>
        </Modal.Footer>
    </Modal> 
}

function DropColumn(props){
    const { show , onHide , deletingColumns } = props
    const [ error , setError ] = React.useState(null)

    return <Modal show={show} onHide={onHide} centered>
        <Modal.Header>Confirm</Modal.Header>
        <Modal.Body>
            <span>Confirm to delete selected columns?</span>
        </Modal.Body>
        <Modal.Footer>
            <Button primary>Proceed</Button>
            <Button secondary>Cancel</Button>
        </Modal.Footer>
    </Modal>
}

function Column(){
    const [ error , setError ] = React.useState(null)
    const [ activePage , setActivePage ] = React.useState(0)
    const [ columns , setColumns ] = React.useState([])
    const [ filtering , setFiltering ] = React.useState('')
    const [ showAddColumnModal , setAddColumnModal ] = React.useState(false)
    const appContext = React.useContext(AppContext)

    const loadColumns = (table) => {
        let subsription = new Database().query(`SELECT name , type FROM pragma_table_info("${table}")`)
        
        subsription.then((res)=>{
            if(res.status === 'Ok'){
                setColumns(res.result.map(col => ({...col  , selected: false})))
            }else{
                throw Error('Unable to load data columns')
            }
        }).catch((error)=>{
            setError(error.message)
        })
    }
    // Subscribe for all available columns
    React.useEffect(()=>{
        if(appContext.selectedTable !== null){
          loadColumns(appContext.selectedTable)
        }   

        return () => {
            setError(null)
        }
    },[])

    return <div style={{overflowY:'auto', maxHeight:'calc( 100vh - 132px )', margin: '10px 0px'}} >
        <div style={{display:'flex'}}>
            <Form>
                <Form.Select selection placeholder="Select table" onChange={(e,{value})=>{appContext.setSelectedTable(value);loadColumns(value)}} value={appContext.selectedTable} options={appContext.main.filter(table => appContext.tables.includes(table)).map(table => ({key:table,value:table,text:table}))}/>
            </Form>
            <div style={{flexGrow:1}}></div>
            <Form style={{margin:'0px 10px'}}>
                <Form.Input placeholder="Search column" type="text" style={{width:'200px'}} value={filtering} onChange={(e,{value})=>setFiltering(value)} />
            </Form>
        </div>
        
        <Table compact celled>
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell />
                    <Table.HeaderCell>Name</Table.HeaderCell>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {columns.filter(col => {
                        const regex = new RegExp(filtering, 'i')
                        return col.name.match(regex)
                    }).slice(activePage*10 , (activePage+1)*10).map((col,colID)=><Table.Row key={colID}>
                    <Table.Cell collapsing>
                        <Checkbox checked={col.selected} onChange={(e,{checked})=>{
                            let _columns = columns.slice()
                            let _column = _columns.find(_col => _col.name === col.name)
                            _column.selected = checked 
                            setColumns(_columns)
                        }}/>
                    </Table.Cell>
                    <Table.Cell>{col.name}</Table.Cell>
                </Table.Row>)}
            </Table.Body>
            <Table.Footer fullWidth>
                <Table.Row>
                    <Table.HeaderCell colSpan="2">
                        <Button floated="left" primary onClick={()=>setAddColumnModal(true)} disabled={true}>Add new column</Button>
                        <Button floated="left" color="red" disabled={true}>Delete column</Button>
                        <Pagination floated="right" activePage={activePage+1} onPageChange={(e,{activePage})=>setActivePage(activePage-1)} 
                            totalPages={Math.floor(columns.filter(col => {
                                const regex = new RegExp(filtering, 'i')
                                return col.name.match(regex)
                            }).length/10)+1}
                        />
                    </Table.HeaderCell>
                </Table.Row>
            </Table.Footer>
        </Table>
        {error !== null && <Message error header="Error" content={error} />}
        <AddNewColumn show={showAddColumnModal} onHide={(refresh=false)=>{
            if(refresh){
                loadColumns()
                setFiltering('')
                setActivePage(Math.floor(columns.length/10)+1)
            }
            setAddColumnModal(false)
        }} />
        <DropColumn show={false} onHide={()=>{console.log('Do nothing')}} />
    </div>
}

export default Column