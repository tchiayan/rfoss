
import React from 'react';
import { Icon , Form ,  Button, Table } from 'semantic-ui-react';
import { Modal } from 'react-bootstrap';

import { Database} from '../Database';

const EditNameInput = (props) => {
    return <Form.Input {...props} autoFocus/>
}


function SettingModal(props){
    const { show, onHide , refreshing, tableQuery , inserNewQuery , tableColumns , additionQuery, table } = props 
    const [ settings , setSettings ] = React.useState([])
    const [ edited , setEdited ] = React.useState(false)
    const [ editText , setEditText ] = React.useState({id:null , value: ''})
    const [ addition , setAdditional ] = React.useState({})
    const db = new Database()

    const initQuery = () => {
        db.query(tableQuery).then((response) => {
            if(response.status === 'Ok'){
                setSettings(response.result)
            }else{
                throw Error("Unable to get setting")
            }
        })
    }

    const updateSetting = (column , value, id) => {
        console.log(`UPDATE ${table} SET ${column} = ${typeof(value) === 'string'? `'${value}'`: value} WHERE ID = ${id}`)
        return db.update(`UPDATE ${table} SET ${column} = ${typeof(value) === 'string'? `'${value}'`: value} WHERE ID = ${id}`)
    } 

    React.useEffect(()=>{
        initQuery()

        if(Object.keys(additionQuery).length > 0){
            Object.entries(additionQuery).forEach(([name , query])=>{
                db.query(query).then((response)=>{
                    if(response.status === 'Ok'){
                        setAdditional((old)=>{
                            return {...old , [name]:response.result}
                        })
                    }
                })
            })
        }
    },[])

    

    return <Modal show={show} onHide={()=>{onHide(); if(edited){refreshing()}}} centered scrollable size="lg">
        <Modal.Header>
            <h4>
                Setting
            </h4>
        </Modal.Header>
        <Modal.Body>
            {!!tableColumns && <Table>
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell>#</Table.HeaderCell>
                        {tableColumns.map((col,colId) => <Table.HeaderCell key={colId}>{col.header}</Table.HeaderCell>)}
                        <Table.HeaderCell/>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {settings.map((row, rowID)=>{
                        return <Table.Row key={rowID}>
                            <Table.Cell>{rowID+1}</Table.Cell>
                            {tableColumns.map((col,colID) => {
                                let child;
                                if(col.edit){
                                    if(col.editType === 'text'){
                                        child = editText.id !== `${rowID}-${colID}` ? <div onDoubleClick={()=>setEditText({id:`${rowID}-${colID}`, value:row[col.field]})}>{row[col.field]}</div> :
                                            <EditNameInput type="text" value={editText.value} onChange={(e,{value})=>{
                                                setEdited(true)
                                                setEditText((old)=>{
                                                    return {id: old.id , value: value}
                                                })
                                            }} onBlur={()=>{
                                                let _settings = settings.slice()
                                                _settings[rowID][col.field] = editText.value

                                                updateSetting(col.field, editText.value, row.ID).then((response)=>{
                                                    if(response.status === 'Ok'){
                                                        setSettings(_settings)
                                                    }else{
                                                        console.log("Unable to update to database") 
                                                    }
                                                }).finally(()=>{
                                                    setEditText({id:null, value: ''})
                                                })
                                                
                                                
                                            }} />
                                    }else if(col.editType === 'selection'){
                                        child = editText.id !== `${rowID}-${colID}` ? <div onDoubleClick={()=>setEditText({id:`${rowID}-${colID}`, value:row[col.field]})}>{row[col.field] === null ? 'Double click to select' :row[col.field]}</div> :
                                            <Form.Select search selection defaultOpen value={row[col.value]} autoFocus 
                                                options={addition[col.editSelection].map(option => ({key:option[col.key],value:option[col.key],text:option[col.text]}))}
                                                onChange={(e,{value, options})=>{
                                                    setEdited(true)
                                                    let _settings = settings.slice()
                                                    _settings[rowID][col.value] = value 
                                                    _settings[rowID][col.field] = options.find(option => option.key === value).text
                                                    setSettings(_settings)
                                                }}
                                                onBlur={()=>{
                                                    updateSetting(col.value, row[col.value], row.ID).then((response)=>{
                                                        if(response.status === 'Ok'){
                                                            //setSettings(_settings)
                                                        }else{
                                                            console.log("Unable to update to database") 
                                                        }
                                                    }).finally(()=>setEditText({id:null, value: ''}))
                                                }} />
                                    }
                                }else{
                                    child = row[col.field]
                                }   
                                return <Table.Cell key={colID}>{child}</Table.Cell>})
                            }
                            <Table.Cell style={{cursor:'pointer'}} onClick={()=>{
                                setEdited(true)
                                db.query(`DELETE FROM ${table} WHERE ID = ${row.ID}`).then((response)=>{
                                    if(response.status==='Ok'){
                                        let _settings = settings.slice()
                                        _settings.splice(rowID , 1)
                                        setSettings(_settings)
                                    }else{
                                        throw Error("Unable to delete chart")
                                    }
                                }).catch((error)=>{
                                    console.log(error.message)
                                })
                            }}>
                                <Icon name="delete" color="red"/>
                            </Table.Cell>
                        </Table.Row>
                    })}
                </Table.Body>
            </Table>}
        </Modal.Body>
        <Modal.Footer>
            <Button primary onClick={()=>{
                setEdited(true)
                db.update(inserNewQuery).then((response)=>{
                    if(response.status === 'Ok'){
                        return initQuery()
                    }else{
                        throw Error("Unable to create new setting")
                    }
                }).catch((err)=>{
                    console.log(err.message)
                })
            }}>Insert new</Button>
        </Modal.Footer>
    </Modal>
}

export default SettingModal;