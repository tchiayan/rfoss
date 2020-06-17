import React from 'react';
import { Database } from '../Database';
import Highcharts from "highcharts";
import HighchartsReact from 'highcharts-react-official';
import { Button , Form , Icon , Menu, Table , Pagination , List , Segment , Header} from 'semantic-ui-react';
import { Card , ProgressBar , Overlay , Modal } from 'react-bootstrap';
import ChartLoading from '../img/chart-loading.gif';
import SpinnerGif from '../img/spinner-gif.gif';
import * as moment from 'moment';
import Excel from 'exceljs';
import FreezeContext from './../module/FreezeView';
import { ToastContext } from './../module/ToastContext';
import AppContext from './../module/AppContext';

function Reset(props){
    const { show , onHide  } = props 

    const formulaList = [
        {name:'DL User Throughput(Mbps)',formula:'avg(DL_User_Average_Throughput_Mbps)'},
        {name:'DL Max Throughput(Mbps)',formula:'avg(Cell_DL_Max_ThroughputtoPDCP_Mbps)'},
        {name:'Total DL Traffic Volume(GB)',formula:'avg(Total_DL_Traffic_Volume_GB)'},
        {name:'Avg No. of user',formula:'avg(Avg_No_of_user_number)'},
        {name:'PRB DL (%)',formula:'avg(PRB_Usage_DL)'},
        {name:'DL.CAUser.Traffic(GB)',formula:'avg(DL_CAUser_Traffic_GB)'},
        {name:'Ave CQI',formula:'avg(CQI_Avg)'},
        {name:'L.Traffic.User.PCell.DL.Avg',formula:'avg(L_Traffic_User_PCell_DL_Avg)'},
        {name:'L.Traffic.User.SCell.DL.Avg',formula:'avg(L_Traffic_User_SCell_DL_Avg)'},
        {name:'PDSCH IBLER',formula:'avg(PDSCH_IBLER)'},
        {name:'DL Edge User TP (Mbps)',formula:'avg(M_DL_Edge_User_Throughput_Mbps)'},
        {name:'DCR',formula:'avg(ERAB_DCR_MME)'},
        {name:'HOSR',formula:'avg(HO_Success_Rate)'},
        {name:'CSFB SR',formula:'avg(CSFB_Preparation_Success_Rate)'},
        {name:'Avg UL Interference(dBm)',formula:'avg(Avg_UL_Interference_dBm)'},
        {name:'CSSR',formula:'avg(CSSR)'},
        {name:'TA (0-78m)%',formula:'sum(L_RA_TA_UE_Index0)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (78m-234m)%',formula:'sum(L_RA_TA_UE_Index1)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (234m-546m)%',formula:'sum(L_RA_TA_UE_Index2)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (546m-1014m)%',formula:'sum(L_RA_TA_UE_Index3)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (1014m-1950m)%',formula:'sum(L_RA_TA_UE_Index4)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (1950m-3510m)%',formula:'sum(L_RA_TA_UE_Index5)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (3510m-6630m)%',formula:'sum(L_RA_TA_UE_Index6)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (6630m-14430m)%',formula:'sum(L_RA_TA_UE_Index7)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (14430m-30030m)%',formula:'sum(L_RA_TA_UE_Index8)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (30030m-53430m)%',formula:'sum(L_RA_TA_UE_Index9)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (53430m-76830m)%',formula:'sum(L_RA_TA_UE_Index10)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (>76830m)%',formula:'sum(L_RA_TA_UE_Index11)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (0-78m)',formula:'sum(L_RA_TA_UE_Index0)'},
        {name:'TA (78m-234m)',formula:'sum(L_RA_TA_UE_Index1)'},
        {name:'TA (234m-546m)',formula:'sum(L_RA_TA_UE_Index2)'},
        {name:'TA (546m-1014m)',formula:'sum(L_RA_TA_UE_Index3)'},
        {name:'TA (1014m-1950m)',formula:'sum(L_RA_TA_UE_Index4)'},
        {name:'TA (1950m-3510m)',formula:'sum(L_RA_TA_UE_Index5)'},
        {name:'TA (3510m-6630m)',formula:'sum(L_RA_TA_UE_Index6)'},
        {name:'TA (6630m-14430m)',formula:'sum(L_RA_TA_UE_Index7)'},
        {name:'TA (14430m-30030m)',formula:'sum(L_RA_TA_UE_Index8)'},
        {name:'TA (30030m-53430m)',formula:'sum(L_RA_TA_UE_Index9)'},
        {name:'TA (53430m-76830m)',formula:'sum(L_RA_TA_UE_Index10)'},
        {name:'TA (>76830m)',formula:'sum(L_RA_TA_UE_Index11)'},

    ]
    const configs = [
        {
            operation: 'Clear all configuration', commands: [
                'DROP TABLE IF EXISTS formulas' ,
                'DROP TABLE IF EXISTS bhlayer',
                'DROP TABLE IF EXISTS mrlayerchart',
                'DROP TABLE IF EXISTS bhmain',
                'DROP TABLE IF EXISTS mrmainchart',
                'DROP TABLE IF EXISTS bisectorchart',
                'DROP TABLE IF EXISTS bisector',
                'DROP TABLE IF EXISTS tagraph',
                'DROP TABLE IF EXISTS tagraph2', 
                'DROP TABLE IF EXISTS tatable', 
                'DROP TABLE IF EXISTS tatable2'
        ], status:'none'},{
            operation: 'Create default KPI list', commands:[
                `CREATE TABLE formulas ( ID INTEGER PRIMARY KEY AUTOINCREMENT , name TEXT , formula TEXT)`, 
                ...formulaList.map(formula => `INSERT INTO formulas (name , formula) VALUES ( '${formula.name}', '${formula.formula}')`)
            ], status:'none'
        }, {
            operation: 'Create default Bh layer charts', commands: [
                `CREATE TABLE bhlayer ( ID INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, formulaid INTEGER, FOREIGN KEY (formulaid) REFERENCES formulas(ID) )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'DL User Throughput(Mbps)' , (SELECT ID FROM formulas WHERE formulas.name = 'DL User Throughput(Mbps)') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'Avg No. of user' , (SELECT ID FROM formulas WHERE formulas.name = 'Avg No. of user') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'PRB DL (%)' , (SELECT ID FROM formulas WHERE formulas.name = 'PRB DL (%)') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'Ave CQI' , (SELECT ID FROM formulas WHERE formulas.name = 'Ave CQI') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'PDSCH IBLER' , (SELECT ID FROM formulas WHERE formulas.name = 'PDSCH IBLER') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'DL.CAUser.Traffic(GB)' , (SELECT ID FROM formulas WHERE formulas.name = 'DL.CAUser.Traffic(GB)') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'DL Max Throughput(Mbps)' , (SELECT ID FROM formulas WHERE formulas.name = 'DL Max Throughput(Mbps)') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'L.Traffic.User.PCell.DL.Avg' , (SELECT ID FROM formulas WHERE formulas.name = 'L.Traffic.User.PCell.DL.Avg') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'L.Traffic.User.SCell.DL.Avg' , (SELECT ID FROM formulas WHERE formulas.name = 'L.Traffic.User.SCell.DL.Avg') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'Total DL Traffic Volume(GB)' , (SELECT ID FROM formulas WHERE formulas.name = 'Total DL Traffic Volume(GB)') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'DL Edge User TP (Mbps)' , (SELECT ID FROM formulas WHERE formulas.name = 'DL Edge User TP (Mbps)') )`,

            ], status:'none'
        }, {
            operation: 'Create default Bh main charts', commands: [
                `CREATE TABLE bhmain ( ID INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, formulaid INTEGER, baselinetitle TEXT , baselinevalue REAL , FOREIGN KEY (formulaid) REFERENCES formulas(ID) )`,
                `INSERT INTO bhmain ( title , formulaid , baselinetitle , baselinevalue ) VALUES ( 'DCR' , (SELECT ID FROM formulas WHERE formulas.name = 'DCR') , 'DCR Baseline' , 2.5 )`,
                `INSERT INTO bhmain ( title , formulaid , baselinetitle , baselinevalue ) VALUES ( 'CSSR' , (SELECT ID FROM formulas WHERE formulas.name = 'CSSR') , 'CSSR Baseline' , 95 )`,
                `INSERT INTO bhmain ( title , formulaid , baselinetitle , baselinevalue ) VALUES ( 'HOSR' , (SELECT ID FROM formulas WHERE formulas.name = 'HOSR') , 'HOSR Baseline' , 97 )`,
                `INSERT INTO bhmain ( title , formulaid , baselinetitle , baselinevalue ) VALUES ( 'CSFB SR' , (SELECT ID FROM formulas WHERE formulas.name = 'CSFB SR') , 'CSFB Baseline' , 98.5)`,
                `INSERT INTO bhmain ( title , formulaid ) VALUES ( 'Avg UL Interference(dBm)' , (SELECT ID FROM formulas WHERE formulas.name = 'Avg UL Interference(dBm)'))`,
            ], status:'none'
        }, {
            operation: 'Create default Bisector charts', commands: [
                `CREATE TABLE bisector ( ID INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, formulaid INTEGER, FOREIGN KEY (formulaid) REFERENCES formulas(ID) )`,
                `INSERT INTO bisector ( title , formulaid ) VALUES ( 'DL User Throughput(Mbps)' , (SELECT ID FROM formulas WHERE formulas.name = 'DL User Throughput(Mbps)') )`,
                `INSERT INTO bisector ( title , formulaid ) VALUES ( 'Avg No. of user' , (SELECT ID FROM formulas WHERE formulas.name = 'Avg No. of user') )`,
                `INSERT INTO bisector ( title , formulaid ) VALUES ( 'PRB DL (%)' , (SELECT ID FROM formulas WHERE formulas.name = 'PRB DL (%)') )`,
                `INSERT INTO bisector ( title , formulaid ) VALUES ( 'Ave CQI' , (SELECT ID FROM formulas WHERE formulas.name = 'Ave CQI') )`,
            ], status:'none'
        }, {
            operation: 'Create default TA charts', commands: [
                `CREATE TABLE tagraph2 ( ID INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, formulaid INTEGER , seriesname TEXT, FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(0-78m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (0-78m)') , 'TA (0-78m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(78m-234m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (78m-234m)') , 'TA (78m-234m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(234m-546m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (234m-546m)') , 'TA (234m-546m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(546m-1014m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (546m-1014m)') , 'TA (546m-1014m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(1014m-1950m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (1014m-1950m)') , 'TA (1014m-1950m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(1950m-3510m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (1950m-3510m)') , 'TA (1950m-3510m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(3510m-6630m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (3510m-6630m)') , 'TA (3510m-6630m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(6630m-14430m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (6630m-14430m)') , 'TA (6630m-14430m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(14430m-30030m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (14430m-30030m)') , 'TA (14430m-30030m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(30030m-53430m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (30030m-53430m)') , 'TA (30030m-53430m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(53430m-76830m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (53430m-76830m)') , 'TA (53430m-76830m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(>76830m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (>76830m)') , 'TA (>76830m)' )`,

            ], status:'none'
        }, {
            operation: 'Create default TA table', commands: [
                `CREATE TABLE tatable2 ( ID INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, formulaid INTEGER , seriesname TEXT ,  FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(0-78m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (0-78m)%') , 'TA (0-78m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(78m-234m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (78m-234m)%') , 'TA (78m-234m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(234m-546m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (234m-546m)%') , 'TA (234m-546m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(546m-1014m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (546m-1014m)%') , 'TA (546m-1014m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(1014m-1950m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (1014m-1950m)%') , 'TA (1014m-1950m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(1950m-3510m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (1950m-3510m)%') , 'TA (1950m-3510m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(3510m-6630m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (3510m-6630m)%') , 'TA (3510m-6630m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(6630m-14430m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (6630m-14430m)%') , 'TA (6630m-14430m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(14430m-30030m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (14430m-30030m)%') , 'TA (14430m-30030m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(30030m-53430m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (30030m-53430m)%') , 'TA (30030m-53430m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(53430m-76830m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (53430m-76830m)%') , 'TA (53430m-76830m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(>76830m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (>76830m)') , 'TA (>76830m)' )`,                

            ], status:'none'
        }
    ]

    const [ configuration , setConfiguration ] = React.useState(configs)
    const [ inOperation , setInOperation ] = React.useState(false)

    React.useEffect(()=>{
        return () => {
            if(!show){
                setConfiguration(configs)
            }
        }
    },[show])
    
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
                setInOperation(false)
            }}>Reset</Button>
            <Button secondary disabled={inOperation} onClick={()=>onHide()}>Exit</Button>
        </Modal.Footer>
    </Modal>
}

function ListCell(props){
    const { show , onHide } = props 
    const [ cellList , setCellList ] = React.useState(['Cell 1' , 'Cell 2' , 'Cell 3'])
    const [ cells , setCells ] = React.useState([])
    const [ activePage , setActivePage ] = React.useState(0)
    const listPerPage = 8

    React.useEffect(()=>{
        if(true){
            let db = new Database()
            db.query(`SELECT Cell_Name FROM main GROUP BY Cell_Name`).then((response)=>{
                if(response.status === 'Ok'){
                    setCellList(response.result.map(entry => entry.Cell_Name))
                    setCells(response.result.map(entry => entry.Cell_Name))
                }else{
                    throw Error("Unable to load cell list")
                }
            }).catch((err)=>{

            })
        }

        return ()=>{
            if(!show){
                setCellList([])
                setCells([])
            }
        }
    },[show])


    return <Modal show={show} onHide={onHide} scrollable centered>
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
            <Button primary onClick={()=>action()}>Proceed</Button>
            <Button secondary onClick={()=>onHide()}>Cancel</Button>
        </Modal.Footer>
    </Modal>
}

function Data(){
    const [ confirm , setConfirm ] = React.useState({show: false , action: ()=>{}, text: ''})
    const [ uploading, setUploading ] = React.useState(false)
    const [ progress , setProgress ] = React.useState(0)
    const [ progressText , setProgressText ] = React.useState('')
    const [ loading , setLoading ] = React.useState(true)
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

    const queryCellCount = (start , end , filter) => {
        setIsQuerying(true)
        let query = new Database().query(`SELECT date(Date) as [date], count(Cell_Name) as [cell_count] FROM main WHERE Date >= '${start}' and Date <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:MM:SS")}' ${!!filter ? `and Cell_Name LIKE '${filter}%'`: ''}GROUP BY date(Date) ORDER BY Date`)
        
        return query.then((response)=>{
            if(response.status === 'Ok'){
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
        })
    }

    const removeDuplicated = (start , end) => {
        let db = new Database()
        freezeContext.setFreeze(true, "Deleting duplicate entry...")
        db.run(`DELETE FROM main WHERE ID NOT IN ( SELECT MIN(ID) FROM main WHERE Date >= '${start}' and Date <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:MM:SS")}' GROUP BY [Cell_Name], date([Date])) and Date >= '${start}' and Date <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:MM:SS")}'`).then((response)=>{
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
        })
    }

    const deleteData = (start , end ) => {
        let db = new Database()
        db.run(`DELETE FROM main WHERE Date >= '${start}' and Date <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:MM:SS")}'`).then((response)=>{
            if(response.status === 'Ok'){
                console.log(response.affectedRows)
            }else{
                throw Error("Unable to delete data")
            }
        }).then(()=>{
            queryCellCount(start, end, filter)
        }).catch((error)=>{
            console.log(error.message)
        })
    }

    const exportRawData = async (start , end , filter) => {
        setUploading(true)
        setProgressText("Exporting... ")
        let db = new Database()
        let wb = new Excel.Workbook()
        let ws = wb.addWorksheet("data")
        let queryDate = moment(start).clone()
        let totalStep = moment(end).diff(queryDate , 'days') + 1
        let step = 1
        let header = false
        while(moment(end).diff(queryDate) >= 0){
            setProgress(Math.round(step/totalStep*100))
            console.log(`Query data for date [${queryDate.format('YYYY-MM-DD')}]`)
            let query = `SELECT * FROM main WHERE Date([Date]) = Date('${queryDate.format('YYYY-MM-DD')}') ${filter ? `and [Cell_Name] LIKE '${filter}%'`: ''}`
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
        setProgressText("")
        setUploading(false)
    }
    //query cell count 
    const init = () => {
        let db = new Database()

        db.query(`SELECT type , name , tbl_name, sql FROM sqlite_master WHERE type ='index' and tbl_name = 'main' and name = 'timeobject' `).then((response)=>{
            if(response.status === 'Ok'){
                if(response.result.length === 1){
                    setIsIndex(true)
                    return true
                }else{
                    setIsIndex(false)
                    return false
                }
            }
        }).then((isIndexed) => {
            if(isIndexed){
                queryCellCount(startdate , enddate)
            }else{
                toastContext.setInfo('Database is not optimized.')
            }
            
        })
    }

    React.useEffect(()=>{
        //Check project main database is indexing or not
        if(appContext.tables.includes("main")){
            init()
        }
    }, [])

    return <div style={{marginTop: '10px', height: 'calc(100vh - 110px)', overflowY: 'auto'}}>
        <Card>
            <Card.Body>
                    <Form>
                        <Form.Group widths="equal" inline>
                            <Form.Input type="date" required label="Start Date" max={enddate} value={startdate} onChange={(e,{value})=>setStartdate(value)}/>
                            <Form.Input type="date" required label="End Date" min={startdate} value={enddate} onChange={(e,{value})=>setEnddate(value)}/>
                            <Form.Input type="text" label="Filter cells" value={filter} onChange={(e,{value})=>setFilter(value)} />
                            <Button onClick={()=>{
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
                                            <Menu.Item name="export-raw-data" disabled={!appContext.tables.includes("main")} onClick={()=>{
                                                setShowCellList(true)
                                                setShowMore(false)
                                            }}>List available cells</Menu.Item>
                                            <Menu.Item name="export-raw-data"  disabled={!appContext.tables.includes("main")} onClick={()=>{
                                                if(filter !== ''){
                                                    exportRawData(startdate , enddate , filter)
                                                }
                                                setShowMore(false)
                                            }}>Export raw data</Menu.Item>
                                            <Menu.Item name="show-database" onClick={()=>{
                                                let db = new Database()
                                                db.send("whereismydb")
                                                setShowMore(false)
                                            }}>Show database</Menu.Item>
                                            <Menu.Item name="link-database" onClick={()=>{
                                                let db = new Database()
                                                db.linkDatabase().then((response)=>{
                                                    if(response.status === 'Ok'){
                                                        if(response.result === 'linked'){
                                                            appContext.updateTables().then((tables)=>{
                                                                if(tables.includes("main")){
                                                                    // reinit the database
                                                                    init()
                                                                }
                                                                //queryCellCount(startdate, enddate , filter)
                                                            })
                                                        }
                                                    }
                                                })
                                                setShowMore(false)
                                            }}>Link database</Menu.Item>
                                            <Menu.Item name="delete-duplicate" disabled={!appContext.tables.includes("main")}  onClick={()=>{
                                                removeDuplicated(startdate, enddate)
                                                setShowMore(false)
                                            }}>Delete duplicate</Menu.Item>
                                            <Menu.Item name="delete-data"  disabled={!appContext.tables.includes("main")} onClick={()=>{
                                                setConfirm({
                                                    show: true , 
                                                    action: ()=>{console.log('delete');deleteData(startdate, enddate)}, 
                                                    text: `Delete data from ${startdate} to ${enddate}`
                                                })
                                                setShowMore(false)
                                            }}>Delete data</Menu.Item>
                                            <Menu.Item name="reset" onClick={()=>{
                                                setShowReset(true)
                                                setShowMore(false)
                                            }}>
                                                Reset configuration
                                            </Menu.Item>
                                            {!isIndex && <Menu.Item name="optimize-database"  disabled={!appContext.tables.includes("main")} onClick={()=>{
                                                freezeContext.setFreeze(true, 'Creating index profile on database')
                                                let db = new Database()
                                                db.update(`CREATE INDEX timeobject ON main (Date COLLATE BINARY, Cell_Name COLLATE NOCASE)`).then((response)=>{
                                                    if(response.status === 'Ok'){
                                                        setIsIndex(true)
                                                    }else{
                                                        
                                                    }
                                                }).finally(()=>{
                                                    freezeContext.setFreeze(false)
                                                })
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
                    
                
                {appContext.tables.includes("main") && chartProps !== null && <HighchartsReact highcharts={Highcharts} options={chartProps} containerProps={{style:{height:'52vh'}}}/>}
                {appContext.tables.includes("main") && !isQuerying && chartProps === null && <Segment placeholder style={{display:'flex', justifyContent: 'center', alignItems: 'center',height:'50vh'}}><Header icon>Query to view daily cell count. Filter is optional</Header></Segment>}
                {appContext.tables.includes("main") && isQuerying && chartProps === null && <div style={{display:'flex', justifyContent: 'center', alignItems: 'center',height:'50vh'}}><img src={SpinnerGif} alt="queryloading" height='24px' width='24px'/></div>}
                {!appContext.tables.includes("main") && <Segment placeholder style={{height:'52vh'}}>
                    <Header icon>
                        No data
                    </Header>
                </Segment>}
            </Card.Body>
            <Card.Footer>
                {!uploading && <Button primary onClick={()=>{
                        let db = new Database();
                        db.upload(
                            'main', 
                            ()=>{
                                // on start uploading
                                //setUploading(true);setProgress(0);setProgressText("Parsing Data")
                                freezeContext.setFreeze(true , "Parsing data")
                            }, 
                            (param)=>{
                                // on uploading
                                //setProgressText("Uploading")
                                //setProgress(Math.round(param.progress*100))
                                freezeContext.setFreeze(true, "Uploading..." , param.progress*100)
                            },
                            ()=>{
                                // on loading end
                                //setUploading(false);setProgressText("");queryCellCount(startdate, enddate, filter)
                                freezeContext.setFreeze(false)
                                if(!appContext.tables.includes('main')){
                                    appContext.updateTables()
                                }
                            },
                            ()=>{
                                // on uploading error
                                //setUploading(false);setProgressText("")
                                freezeContext.setFreeze(false)
                                toastContext.setError('Error occured when uploading stats')
                            }
                        )
                    }}>
                        Select file to upload
                </Button>}
                {uploading && <div>
                    <div style={{marginBottom: '4px'}}>{progressText}</div>
                    <ProgressBar now={progress} striped  variant="info" />
                </div>}
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