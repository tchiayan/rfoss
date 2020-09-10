import React from 'react';
import { Database } from '../Database';
import Highcharts from "highcharts";
import HighchartsReact from 'highcharts-react-official';
import { Button , Form , Icon , Menu, Table , Pagination , List , Segment , Header , Loader} from 'semantic-ui-react';
import { Card  , Overlay , Modal } from 'react-bootstrap';
//import ChartLoading from '../img/chart-loading.gif';
import SpinnerGif from '../img/spinner-gif.gif';
import * as moment from 'moment';
import Excel from 'exceljs';
import FreezeContext from './../module/FreezeView';
import { ToastContext } from './../module/ToastContext';
import AppContext from './../module/AppContext';

function Reset(props){
    const { show , onHide  } = props 
    const appContext = React.useContext(AppContext)
    
    const [ configuration , setConfiguration ] = React.useState([])
    const [ inOperation , setInOperation ] = React.useState(false)

    
    
    React.useEffect(()=>{
        if(appContext.defaultSetting !== null && appContext.defaultSetting !== undefined){
            setConfiguration(appContext.defaultSetting)
        }
        console.log(appContext.defaultSetting)
    }, [appContext.defaultSetting])

    return <Modal show={show} onHide={onHide} backdrop="static" centered>
        <Modal.Header>Reset configuration</Modal.Header>
        <Modal.Body>
            <List>
                {configuration.map((config, configId) => {
                    return <List.Item key={configId} icon={config.status === 'none'?'hand point right':config.status ==='success'? 'thumbs up outline': 'times'} content={config.operation}/>
                })}
            </List>
        </Modal.Body>
        <Modal.Footer>
            <Button primary disabled={inOperation} onClick={async ()=>{
                setInOperation(true)
                let db = new Database()

                for(let i = 0 ; i < configuration.length ; i++){
                    const { commands } = configuration[i]
                    let failCount = 0 
                    let successCount = 0
                    for(let j = 0 ; j < commands.length ; j++){
                        await db.update(commands[j]).then((response)=>{
                            if(response.status === 'Ok'){
                                successCount++
                            }else{
                                console.log(`Fail to run this commmand : ${commands[j]}`)
                                failCount++
                            }
                        })
                    }

                    setConfiguration((oldConfig)=>{
                        let _oldConfig = [...oldConfig]
                        _oldConfig[i].status = successCount === commands.length ? 'success' : 'fail'
                        return _oldConfig
                    })
                }

                appContext.updateTables()
                setInOperation(false)
            }}>Reset</Button>
            <Button secondary disabled={inOperation} onClick={()=>onHide()}>Exit</Button>
        </Modal.Footer>
    </Modal>
}

function ListCell(props){
    const { show , onHide } = props 
    const [ isTableSelected, setTableSelected ] = React.useState(false)
    const [ cellList , setCellList ] = React.useState(['Cell 1' , 'Cell 2' , 'Cell 3'])
    const [ cells , setCells ] = React.useState([])
    const [ activePage , setActivePage ] = React.useState(0)
    const appContext = React.useContext(AppContext)
    const listPerPage = 8

    React.useEffect(()=>{
        if(show){
            appContext.promptTableSelection((table)=>{
                console.log(`List all cell for table [${table}]`)
                let db = new Database()
                db.query(`SELECT ${appContext.objectDate.object} as [object] FROM ${table} GROUP BY ${appContext.objectDate.object}`).then((response) => {
                    if(response.status === 'Ok'){
                        setCellList(response.result.map(entry => entry.object))
                        setCells(response.result.map(entry => entry.object))
                        setTableSelected(true)
                    }else{
                        throw Error("Unable to load cell list")
                    }
                })
            })
            /*let db = new Database()
            db.query(`SELECT Cell_Name FROM main GROUP BY Cell_Name`).then((response)=>{
                if(response.status === 'Ok'){
                    setCellList(response.result.map(entry => entry.Cell_Name))
                    setCells(response.result.map(entry => entry.Cell_Name))
                }else{
                    throw Error("Unable to load cell list")
                }
            }).catch((err)=>{
            })*/
        }

        return ()=>{
            if(!show){
                setCellList([])
                setCells([])
                setTableSelected(false)
            }
        }
    },[show])


    return <Modal show={show && isTableSelected} onHide={onHide} scrollable centered>
        <Modal.Header>
            <div style={{display:'flex', alignItems: 'center', width: '100%'}}>
                <div><h4>Available cells</h4></div>
                <div style={{flexGrow: 1}}></div>
                <Form onSubmit={(e)=>{
                    let form = e.target
                    let _filter = form.querySelector("#filter-cell").value
                    setCells(cellList.filter(cell => {
                        let regex = new RegExp(_filter , 'i')
                        return cell.match(regex)
                    }))
                }}>
                    <Form.Group inline style={{margin: '0px'}}>
                        <Form.Input id="filter-cell" type="text" placeholder="Search cell" />
                        <Button icon ><Icon name="search" /></Button>
                    </Form.Group>
                    
                </Form>
                
            </div>
        </Modal.Header>
        <Modal.Body>
            
            <Table celled striped size="small">
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell>Cell Name</Table.HeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {cells.slice(activePage*listPerPage, (activePage+1)*listPerPage).map((cell,id)=>(
                        <Table.Row key={id}>
                            <Table.Cell>{cell}</Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
                <Table.Footer>
                    <Table.Row>
                        <Table.HeaderCell>
                            <div style={{display:'flex'}}>
                                <div style={{flexGrow: 1}}></div>   
                                <Pagination 
                                    activePage={activePage}
                                    boundaryRange={0}
                                    onPageChange={(e,{activePage})=>setActivePage(activePage-1)}
                                    totalPages={Math.floor(cells.length/listPerPage)} />
                            </div>
                            
                        </Table.HeaderCell>
                    </Table.Row>
                </Table.Footer>
            </Table>
        </Modal.Body>    
    </Modal>
}

function ConfirmAction(props){
    const { show , onHide , action , text } = props

    return <Modal show={show} onHide={onHide} centered>
        <Modal.Header>
            <h4>Confirmation</h4>
        </Modal.Header>
        <Modal.Body>
            <span>{text}</span>
        </Modal.Body>
        <Modal.Footer>
            <Button primary onClick={()=>{action();onHide()}}>Proceed</Button>
            <Button secondary onClick={()=>onHide()}>Cancel</Button>
        </Modal.Footer>
    </Modal>
}

function Data(){
    const [ confirm , setConfirm ] = React.useState({show: false , action: ()=>{}, text: ''})
    //const [ uploading, setUploading ] = React.useState(false)
    //const [ progress , setProgress ] = React.useState(0)
    //const [ progressText , setProgressText ] = React.useState('')
    //const [ loading , setLoading ] = React.useState(true)
    const [chartProps , setChartProps ] = React.useState(null)
    const [ startdate , setStartdate ] = React.useState(moment(new Date()).startOf('day').subtract(31 , 'day').format("YYYY-MM-DD"))
    const [ enddate , setEnddate ] = React.useState(moment(new Date()).startOf('day').subtract(1 , 'day').format("YYYY-MM-DD"))
    const moreTarget = React.useRef();
    const [ showMore , setShowMore ] = React.useState(false)
    const [ showCellList , setShowCellList ] = React.useState(false)
    const [ showReset, setShowReset ] = React.useState(false)
    const [ filter , setFilter] = React.useState('')
    const [ isIndex , setIsIndex ] = React.useState(true)
    const freezeContext = React.useContext(FreezeContext)
    const toastContext = React.useContext(ToastContext)
    const appContext = React.useContext(AppContext)
    const [ isQuerying , setIsQuerying ] = React.useState(false)
    const [ lockOperation , setLockOperation ] = React.useState(false)

    React.useEffect(() => {
        setLockOperation(appContext.databaseBusy)
    }, [ appContext.databaseBusy ])

    const queryCellCount = async (start , end , filter) => {
        setIsQuerying(true)
        console.log(appContext)
        let queries = appContext.main.filter(table => appContext.tables.includes(table)).map(table => {
            return {table:table, command:`SELECT date(${appContext.objectDate.date}) as [date] , count(${appContext.objectDate.object}) as [cell_count] FROM ${table} WHERE date between '${start}' and  '${moment(end).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ${!!filter ? `and object LIKE '${filter}%'`: ''}GROUP BY date(${appContext.objectDate.date}) ORDER BY date(${appContext.objectDate.date})`}
    })
        let range = new Array(moment(end).diff(start, 'day')+1).fill('').map((entry, id) => moment(start).clone().add(id , 'day').format('YYYY-MM-DD'))
        let charts = {
            chart:{
                type: 'line',
                plotBackgroundColor: '#f5f5f5'
            },
            title: {
                text: 'Cell Count'
            }, 
            xAxis: {
                categories: range
            }, 
            yAxis: {
                title:{
                    text: 'Number of cells'
                }
            }, 
            series:[]
        }
        for(let i=0,q; q=queries[i];i++){
            console.log(q.command)
            let query = await new Database().query(q.command)
            if(query.status === 'Ok'){
                let result = query.result.reduce((obj , entry) => ({...obj , [entry.date]:entry.cell_count}) , {})
                charts.series.push({
                    name: q.table, 
                    data: range.map(date => {
                        return [date , result[date] === undefined ? 0 : result[date]]
                    })
                })
            }
        }

        //console.log(queries)
        //console.log(charts)
        setChartProps(charts)
        /*let query = new Database().query(`SELECT date(date) as [date], count(object) as [cell_count] FROM RAW2G WHERE date >= '${start}' and date <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ${!!filter ? `and object LIKE '${filter}%'`: ''}GROUP BY date(date) ORDER BY date`)
        
        return query.then((response)=>{
            if(response.status === 'Ok'){
                console.log(response.result)
                let range = new Array(moment(end).diff(start, 'day')+1).fill('').map((entry, id) => moment(start).clone().add(id , 'day').format('YYYY-MM-DD'))
                let result = response.result.reduce((obj , entry) => ({...obj , [entry.date]:entry.cell_count}) , {})
                setChartProps({
                    chart:{
                        type: 'column',
                        plotBackgroundColor: '#f5f5f5'
                    },
                    title: {
                        text: 'Cell Count'
                    }, 
                    xAxis: {
                        categories: range
                    }, 
                    yAxis: {
                        title:{
                            text: 'Number of cells'
                        }
                    }, 
                    series:[{
                        name: '4G',
                        data: range.map(date => {
                            return [date , result[date] === undefined ? 0 : result[date]]
                        })
                    }]
                })
            }else{
                throw Error("Unable to get cell count")
            }
        }).catch((err)=>{
            console.log(err.message)
        }).finally(()=>{
            setIsQuerying(false)
        })*/
    }

    const removeDuplicated = (start , end) => {
        appContext.promptTableSelection((table)=>{
            let db = new Database()
            freezeContext.setFreeze(true, "Deleting duplicate entry...")
            db.run(`DELETE FROM ${table} WHERE ID NOT IN ( SELECT MIN(ID) FROM ${table} WHERE ${appContext.objectDate.date} >= '${start}' and ${appContext.objectDate.date} <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' GROUP BY [${appContext.objectDate.object}], date([${appContext.objectDate.date}])) and ${appContext.objectDate.date} >= '${start}' and ${appContext.objectDate.date} <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:mm:ss")}'`).then((response)=>{
                if(response.status === 'Ok'){
                    console.log(response.affectedRows)
                }else{
                    throw Error("Unable to delete duplicate rows")
                }
            }).then(() => {
                queryCellCount(start, end)
            }).catch((err)=>{
                console.log(err.message)
            }).finally(()=>{
                freezeContext.setFreeze(false)
                queryCellCount(start, end)
            })
        })
        
    }

    const deleteData = (start , end ) => {
        appContext.promptTableSelection((table)=>{
            let db = new Database()
            freezeContext.setFreeze(true, `Deleting data [${table}] from ${start} until ${end}...`)
            db.run(`DELETE FROM ${table} WHERE ${appContext.objectDate.date} >= '${start}' and  ${appContext.objectDate.date} <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:mm:ss")}'`).then((response)=>{
                if(response.status === 'Ok'){
                    console.log(response.affectedRows)
                }else{
                    throw Error("Unable to delete data")
                }
            }).catch((error)=>{
                console.log(error.message)
            }).finally(()=>{
                freezeContext.setFreeze(false)
                queryCellCount(start, end)
            })
        })
    }

    const exportRawData = async (start , end , filter, table) => {
        freezeContext.setFreeze(true , "Exporting raw data")
        //setUploading(true)
        let db = new Database()
        let wb = new Excel.Workbook()
        let ws = wb.addWorksheet("data")
        let queryDate = moment(start).clone()
        let totalStep = moment(end).diff(queryDate , 'days') + 1
        let step = 1
        let header = false
        while(moment(end).diff(queryDate) >= 0){
            //setProgress(Math.round(step/totalStep*100))
            console.log(`Query data for date [${queryDate.format('YYYY-MM-DD')}] and [${queryDate.clone().endOf('days').format('YYYY-MM-DD HH:mm:ss')}] `)
            let query = `SELECT * FROM ${table} WHERE ([${appContext.objectDate.date}] between '${queryDate.format('YYYY-MM-DD')}' and '${queryDate.clone().endOf('days').format('YYYY-MM-DD HH:mm:ss')}') ${filter ? `and [${appContext.objectDate.object}] LIKE '${filter}%'`: ''}`
            let response = await db.querybig(query)

            if(response.status === 'Ok'){
                let data = JSON.parse(response.result)
                for(let i = 0 ; i < data.length ; i++){
                    if(!header) {ws.addRow(Object.keys(data[i]));header=true}
                    ws.addRow(Object.values(data[i]))
                }
            }
            step += 1
            queryDate.add(1, 'days')
        }

        await wb.xlsx.writeBuffer().then((buffer) => {
            let blob = new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
            let elem = window.document.createElement("a")
            elem.href = window.URL.createObjectURL(blob)
            elem.download = 'data.xlsx'
            elem.click()
        })

        freezeContext.setFreeze(false)
        //setUploading(false)
    }
    //query cell count 
    const init = async () => {
        let db = new Database()
        
        db.query(`SELECT type , name , tbl_name, sql FROM sqlite_master WHERE type ='index' and ( ${appContext.tables.filter(table => appContext.main.includes(table)).map(table => `tbl_name = '${table}'`).join(" or ")} ) and name LIKE 'timeobject_%' `).then((response)=>{
            if(response.status === 'Ok'){
                if(response.result.length === appContext.tables.filter(table => appContext.main.includes(table)).length){
                    setIsIndex(true)
                    return true
                }else{
                    setIsIndex(false)
                    return false
                }
            }else{
                throw new Error("Unable to query index")
            }
        }).then((isIndexed) => {
            console.log(isIndexed)
            if(isIndexed){
                //queryCellCount(startdate , enddate)
            }else{
                toastContext.setInfo('Database is not optimized.')
            }
            
        }).catch((error)=>{
            
        })
    }

    React.useEffect(()=>{
        //Check project main database is indexing or not
        console.log(`Check appContext [${appContext.tables.filter(table => appContext.main.includes(table)).join(",")}]`)
        if(appContext.tables.filter(table => appContext.main.includes(table)).join(",").length > 0){
            init()
        }
    }, [appContext.tables])

    return <div style={{marginTop: '10px', height: 'calc(100vh - 110px)', overflowY: 'auto'}}>
        <Card className="react-card">
            <Card.Body>
                    <Form>
                        <Form.Group widths="equal" inline>
                            <Form.Input className="semantic-react-form-input" type="date" required label="Start Date" max={enddate} value={startdate} onChange={(e,{value})=>setStartdate(value)}/>
                            <Form.Input className="semantic-react-form-input" type="date" required label="End Date" min={startdate} value={enddate} onChange={(e,{value})=>setEnddate(value)}/>
                            <Form.Input className="semantic-react-form-input" type="text" label="Filter cells" value={filter} onChange={(e,{value})=>setFilter(value)} />
                            <Button disabled={appContext.main.filter(table => appContext.tables.includes(table)).length === 0} onClick={()=>{
                                setChartProps(null)
                                queryCellCount(startdate , enddate, filter)
                            }}>Query</Button>
                            <>
                                <div ref={moreTarget} style={{width:'20px',height: '20px', cursor: 'pointer'}} onClick={()=>{
                                    setShowMore(true)
                                }}>
                                    <Icon name="ellipsis vertical" />
                                </div>
                                <Overlay target={moreTarget.current} show={showMore} placement="bottom" rootClose={true} onHide={()=>setShowMore(false)}>
                                    {({
                                        placement,
                                        scheduleUpdate,
                                        arrowProps,
                                        outOfBoundaries,
                                        show: _show,
                                        ...props
                                    }) => (
                                        <Menu {...props} style={{...props.style}} vertical pointing={true}>
                                            <Menu.Item name="show-cell-list" disabled={appContext.main.filter(table => appContext.tables.includes(table)).length === 0 || lockOperation} onClick={()=>{
                                                setShowCellList(true)
                                                setShowMore(false)
                                            }}>List available cells</Menu.Item>
                                            <Menu.Item name="export-raw-data"  disabled={appContext.main.filter(table => appContext.tables.includes(table)).length === 0  || lockOperation} onClick={()=>{
                                                if(filter !== ''){
                                                    appContext.promptTableSelection((table)=>{
                                                        exportRawData(startdate , enddate , filter , table)
                                                    })
                                                }
                                                setShowMore(false)
                                            }}>Export raw data</Menu.Item>
                                            <Menu.Item name="show-database" onClick={()=>{
                                                let db = new Database()
                                                db.send("whereismydb")
                                                setShowMore(false)
                                            }}>Show database</Menu.Item>
                                            <Menu.Item name="link-database" disabled={lockOperation} onClick={()=>{
                                                let db = new Database()
                                                db.linkDatabase().then((response)=>{
                                                    if(response.status === 'Ok'){
                                                        if(response.result === 'linked'){
                                                            appContext.updateTables().then((tables)=>{
                                                                //if(tables.includes("main")){
                                                                //    // reinit the database
                                                                //    init()
                                                                //}
                                                                //queryCellCount(startdate, enddate , filter)
                                                                init()
                                                            })
                                                        }
                                                    }
                                                })
                                                setShowMore(false)
                                            }}>Link database</Menu.Item>
                                            <Menu.Item name="delete-duplicate" disabled={appContext.main.filter(table => appContext.tables.includes(table)).length === 0 || lockOperation}  onClick={()=>{
                                                removeDuplicated(startdate, enddate)
                                                setShowMore(false)
                                            }}>Delete duplicate</Menu.Item>
                                            <Menu.Item name="delete-data"  disabled={appContext.main.filter(table => appContext.tables.includes(table)).length === 0  || lockOperation} onClick={()=>{
                                                setConfirm({
                                                    show: true , 
                                                    action: ()=>{deleteData(startdate, enddate)}, 
                                                    text: `Delete data from ${startdate} to ${enddate}`
                                                })
                                                setShowMore(false)
                                            }}>Delete data</Menu.Item>
                                            <Menu.Item name="reset" disabled={lockOperation} onClick={()=>{
                                                setShowReset(true)
                                                setShowMore(false)
                                            }}>
                                                Reset configuration
                                            </Menu.Item>
                                            {!isIndex && <Menu.Item name="optimize-database"   disabled={lockOperation}  onClick={async ()=>{
                                                freezeContext.setFreeze(true, 'Creating index profile on database')
                                                let db = new Database()

                                                let allTable = appContext.tables.filter(table => appContext.main.includes(table))
                                                let indexedTable = await db.query(`SELECT type , name , tbl_name, sql FROM sqlite_master WHERE type ='index' and ( ${appContext.tables.filter(table => appContext.main.includes(table)).map(table => `tbl_name = '${table}'`).join(" or ")} ) and name LIKE 'timeobject_%' `).then(response => {
                                                    if(response.status === 'Ok'){
                                                        return response.result.map(row => row.tbl_name)
                                                    }else{
                                                        return []
                                                    }
                                                }).catch((error) => {
                                                    console.log('error while quering indexed table')
                                                    return []
                                                })

                                                //console.log(allTable)
                                                //console.log(indexTable)

                                                let tableToIndex = allTable.filter(table => !indexedTable.includes(table))
                                                //console.log(tableToIndex)
                                                let error = false
                                                for(let i = 0 ; i < tableToIndex.length ; i++){
                                                    console.log(`CREATE INDEX timeobject_${tableToIndex[i]} ON ${tableToIndex[i]} (${appContext.objectDate.date} COLLATE BINARY, ${appContext.objectDate.object} COLLATE NOCASE)`)
                                                    await db.update(`CREATE INDEX timeobject_${tableToIndex[i]} ON ${tableToIndex[i]} (${appContext.objectDate.date} COLLATE BINARY, ${appContext.objectDate.object} COLLATE NOCASE)`).then((response) => {
                                                        if(response.status === 'Ok'){
                                                            return 
                                                        }else{
                                                            error = true    
                                                            return
                                                        }
                                                    })
                                                }

                                                if(!error){
                                                    setIsIndex(true)
                                                }else{
                                                    toastContext.setError("Error while optimizing database")
                                                }

                                                
                                                /*db.update(`CREATE INDEX timeobject ON main (Date COLLATE BINARY, Cell_Name COLLATE NOCASE)`).then((response)=>{
                                                    if(response.status === 'Ok'){
                                                        setIsIndex(true)
                                                    }else{
                                                        
                                                    }
                                                }).finally(()=>{
                                                    freezeContext.setFreeze(false)
                                                })*/
                                                freezeContext.setFreeze(false)
                                                setShowMore(false)
                                            }}>
                                                Optimize database
                                            </Menu.Item>}
                                        </Menu>
                                    )}
                                </Overlay>
                            </>
                        </Form.Group>
                    </Form>
                    
                {appContext.main.filter(table => appContext.tables.includes(table)).length > 0 && chartProps !== null && <HighchartsReact highcharts={Highcharts} options={chartProps} containerProps={{style:{height:'52vh'}}}/>}
                {appContext.main.filter(table => appContext.tables.includes(table)).length > 0 && !isQuerying && chartProps === null && <Segment placeholder style={{display:'flex', justifyContent: 'center', alignItems: 'center',height:'50vh'}}><Header icon>Query to view daily cell count. Filter is optional</Header></Segment>}
                {appContext.main.filter(table => appContext.tables.includes(table)).length > 0 && isQuerying && chartProps === null && <div style={{display:'flex', justifyContent: 'center', alignItems: 'center',height:'50vh'}}><Loader active/></div>}
                {appContext.main.filter(table => appContext.tables.includes(table)).length === 0 && <Segment placeholder style={{height:'52vh'}}>
                    <Header icon>
                        Missing configuration.
                    </Header>
                    <Button onClick={async () => {
                        freezeContext.setFreeze(true , "Loading...")

                        let db = new Database()
                        if(appContext.defaultSetting.length > 0){
                            for(let i = 0 ; i < appContext.defaultSetting.length ; i++){
                                const { commands, operation } = appContext.defaultSetting[i]
                                let failCount = 0 
                                let successCount = 0
                                for(let j = 0 ; j < commands.length ; j++){
                                    freezeContext.setFreeze(true , `${operation} [${j}/${commands.length}]`)
                                    await db.update(commands[j]).then((response)=>{
                                        freezeContext.setFreeze(true , `${operation} [${j+1}/${commands.length}]`)
                                        if(response.status === 'Ok'){
                                            successCount++
                                        }else{
                                            console.log(`Fail to run this commmand : ${commands[j]}`)
                                            failCount++
                                        }
                                    })
                                }
                            }
                        }

                        
                        if(appContext.uploadingOptions){
                            let tablesConfig = Object.entries(appContext.uploadingOptions.alias)
                            for(let i = 0 ; i < tablesConfig.length ; i ++){
                                const [ table , tableConfig ] = tablesConfig[i]
                                freezeContext.setFreeze(true, `Creating data tables: ${table}`)
                                let command = `CREATE TABLE ${table} (  ${["ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL" , ...tableConfig.map(col => `${col.name} ${col.format}`)].join(" , ")} ) `
                                await db.update(command).then((response) => {
                                    if(response.status === 'Ok'){

                                    }else{

                                    }
                                })
                            }
                        }

                        

                        // Optimize database
                        freezeContext.setFreeze(true, 'Creating index profile on database')
                        let tables = await appContext.updateTables()
                        let allTable = tables.filter(table => appContext.main.includes(table))
                        let indexedTable = await db.query(`SELECT type , name , tbl_name, sql FROM sqlite_master WHERE type ='index' and ( ${tables.filter(table => appContext.main.includes(table)).map(table => `tbl_name = '${table}'`).join(" or ")} ) and name LIKE 'timeobject_%' `).then(response => {
                            if(response.status === 'Ok'){
                                return response.result.map(row => row.tbl_name)
                            }else{
                                return []
                            }
                        }).catch((error) => {
                            console.log('error while quering indexed table')
                            return []
                        })

                        let tableToIndex = allTable.filter(table => !indexedTable.includes(table)) 
                        let error = false
                        for(let i = 0 ; i < tableToIndex.length ; i++){
                            freezeContext.setFreeze(true, `Creating index profile on database ${tableToIndex[i]}`)
                            console.log(`CREATE INDEX timeobject_${tableToIndex[i]} ON ${tableToIndex[i]} (${appContext.objectDate.date} COLLATE BINARY, ${appContext.objectDate.object} COLLATE NOCASE)`)
                            await db.update(`CREATE INDEX timeobject_${tableToIndex[i]} ON ${tableToIndex[i]} (${appContext.objectDate.date} COLLATE BINARY, ${appContext.objectDate.object} COLLATE NOCASE)`).then((response) => {
                                if(response.status === 'Ok'){
                                    return 
                                }else{
                                    error = true    
                                    return
                                }
                            })
                        }
                        
                        if(!error){
                            setIsIndex(true)
                        }else{
                            toastContext.setError("Error while optimizing database")
                        }

                        freezeContext.setFreeze(false)

                    }}>Setup now</Button>
                </Segment>}
            </Card.Body>
            <Card.Footer>
                
                {appContext.main.map((table,tableId) => <Button key={tableId} content='Upload' disabled={lockOperation || !appContext.tables.includes(table)} label={{basic:true,content:table}} primary onClick={()=>{
                    let db = new Database();
                    db.upload(
                        table,
                        appContext.uploadingFormat, 
                        ()=>{
                            // on start uploading
                            //setUploading(true);setProgress(0);setProgressText("Parsing Data")
                            appContext.cancelSync()
                            freezeContext.setFreeze(true , "Parsing data")
                        }, 
                        (param)=>{
                            // on uploading
                            //setProgressText("Uploading")
                            //setProgress(Math.round(param.progress*100))
                            freezeContext.setFreeze(true, "Uploading..." , param.progress*100)
                        },
                        async ()=>{
                            // on loading end
                            

                            // upload to online database
                            if(!appContext.tables.includes(table)){
                                appContext.updateTables()
                            }

                            queryCellCount(startdate,enddate,filter)
                            // update to online database
                            
                            appContext.startSync(900000)
                            freezeContext.setFreeze(false)
                        },
                        ()=>{
                            // on uploading error
                            //setUploading(false);setProgressText("")
                            freezeContext.setFreeze(false)
                            toastContext.setError('Error occured when uploading stats')
                        }, 
                        appContext.uploadingOptions,
                        appContext.uploadOnlineOnSuccess ? appContext.databaseServer : ''
                    )
                }}/>)}
            </Card.Footer>
        </Card>
        <ConfirmAction show={confirm.show} onHide={()=>{
            setConfirm({show: false , action:()=>{}, text: ''})
        }} action={confirm.action} text={confirm.text} />
        <ListCell show={showCellList} onHide={()=>setShowCellList(false)}/>

        <Reset show={showReset} onHide={()=>setShowReset(false)} />
    </div>
}

export default Data;