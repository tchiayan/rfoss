import React from 'react';
import { Segment , Header , Icon , Form , Message, Button , Menu  } from 'semantic-ui-react';
import { Modal , Overlay, Spinner } from 'react-bootstrap';

import { Database } from '../Database';
import SettingModal from '../module/SettingModal';
import { pivot } from '../module/Function';
import * as moment from 'moment';

import Highcharts from "highcharts";
import HighchartsCustomEvents from 'highcharts-custom-events';
import HighchartsReact from 'highcharts-react-official';

import { AgGridReact } from '@ag-grid-community/react';
import {AllCommunityModules} from '@ag-grid-community/all-modules';
import '@ag-grid-community/all-modules/dist/styles/ag-grid.css';
import '@ag-grid-community/all-modules/dist/styles/ag-theme-balham.css';

HighchartsCustomEvents(Highcharts)

function ChartConfigModal(props){
    const { show , onHide , min, max , chartId, changeScale , axis} = props;

    const [ minValue , setMinValue ] = React.useState(0)
    const [ maxValue , setMaxValue ] = React.useState(0)
    const [ error , setError ] = React.useState(false)
    React.useEffect(()=>{
        if(show && min !== null && max !== null){
            setMinValue(min)
            setMaxValue(max)
        }

        return () => {
            if(!show){
                setMinValue(0)
                setMaxValue(0)
            }
        }
    },[min, max , show ])

    return <Modal centered show={show} onHide={onHide}>
        <Modal.Header>
            Edit Scale
        </Modal.Header>
        <Modal.Body>
            <Form error={error}>
                <Form.Input type="text" label="Min" value={minValue} onChange={(e,{value})=>{
                    setMinValue(value)
                    if(isNaN(value)){
                        setError(true)
                    }else{
                        setError(false)
                    }
                }} />
                <Form.Input type="text" label="Max" value={maxValue} onChange={(e,{value})=>{
                    setMaxValue(value)
                    if(isNaN(value)){
                        setError(true)
                    }else{
                        setError(false)
                    }
                }}/>
                <Message error header={'Incorrect value'} />
            </Form>
        </Modal.Body>
        <Modal.Footer>
            <Button primary onClick={()=>{
                changeScale(chartId , minValue , maxValue , axis)
                onHide()
            }}>Save</Button>
        </Modal.Footer>
    </Modal>
}

function Ta(props){
    const { startDate , endDate , sites , setQuerying , refreshing , onDoneRefreshing, querying} = props 
    const [ columnsList , setColumnsList ] = React.useState([])
    const [ chartData , setChartData ] = React.useState([])
    const [ chartSeries , setChartSeries ] = React.useState([])
    const [ chart , setChart ] = React.useState(null)
    const [ chartConfig , setChartConfig ] = React.useState({show: false, min: null , max: null , id: null, axis: 0})
    const [ showMore , setShowMore ] = React.useState(false)
    const [ columnDef , setColumnDef ] = React.useState([])
    const [ rowData , setRowData ] = React.useState([])
    const [ tableData , setTableData ] = React.useState([])
    const [ showTableSetting , setShowTableSetting ] = React.useState(false)
    const [ showChartSetting , setShowChartSetting ] = React.useState(false)
    const moreTarget = React.useRef();

    const loadColumnsConfig = () => {
        let db = new Database().query(`SELECT tatable2.ID , tatable2.title , tatable2.formulaid , tatable2.seriesname , formulas.name , formulas.formula FROM tatable2 LEFT JOIN formulas ON tatable2.formulaid = formulas.ID`)
        return db.then((response)=>{
            if(response.status === 'Ok'){
                setColumnsList(response.result)
                return response.result
            }else{
                throw Error("Unable to load table configuration")
            }
        })
    }

    const loadChartsSeriesConfig = () => {
        let db = new Database().query(`SELECT tagraph2.ID , tagraph2.title , tagraph2.formulaid , tagraph2.seriesname , formulas.name , formulas.formula FROM tagraph2 LEFT JOIN formulas ON tagraph2.formulaid = formulas.ID`)
        return db.then((response)=>{
            if(response.status === 'Ok'){
                setChartSeries(response.result)
                return response.result
            }else{
                throw Error("Unable to load chart configuration")
            }
        })
    }

    const queryColumnFunction = (columns) => {
        let queryString = `SELECT strftime('%m/%d/%Y',Date([Date])) as [Date] , [eNodeB_Name] as [eNodeB Name] , [Cell_FDD_TDD_Indication] as [Cell FDD TDD Indication] , substr([Cell_Name],0,9) as [Cell Name] , ${columns.map(config => `${config.formula} AS [${config.title}]`).join(",")} FROM main WHERE [Date] >= '${endDate}' and  [Date] < '${moment(endDate).clone().add(1,'days').format("YYYY-MM-DD")}' and [Cell_Name] LIKE '${sites}%' GROUP BY Date([Date]) , substr([Cell_Name],0,9)` 
        let db = new Database().query(queryString)
        return db.then((response)=>{
            if(response.status === 'Ok'){
                let sortField = ['Date', 'eNodeB Name', 'Cell FDD TDD Indication', 'Cell Name', ...columns.map(config => config.title)]
                if(response.result.length > 0){
                    setColumnDef(
                        sortField.map(column => ({headerName:column,field:column, resizable:true, sortable:true}))
                    )
                    setRowData(response.result)
                    setTableData([[...(new Array(4)).fill(null) , "TA Range"],sortField, ...response.result.map(row => sortField.map(colName => row[colName]))])
                }else{
                    setColumnDef([])
                    setRowData([])
                }
            }else{
                throw Error("Unable to query result")
            }
        })
    }

    const queryChartFunction = (series) => {
        let queryString = `SELECT strftime('%m/%d/%Y',Date([Date])) as [Date] , substr([Cell_Name],0,9) as [Cell Name] , ${series.map(config => `${config.formula} AS [${config.title}]`).join(",")} FROM main WHERE  [Date] >= '${endDate}' and  [Date] < '${moment(endDate).clone().add(1,'days').format("YYYY-MM-DD")}'  and [Cell_Name] LIKE '${sites}%' GROUP BY Date([Date]) , substr([Cell_Name],0,9)` 
        let db = new Database()
        return db.query(queryString).then((response)=>{
            if(response.status === 'Ok'){
                let table = pivot(response.result, "Cell Name" , series.map(entry => entry.title), null)
                table = table[0].map((_, colIndex) => table.map(row => row[colIndex]));
                setChartData(table)
                
                setChart({
                    //id: chartid, 
                    chart:{
                        type:'line',
                    },
                    title:{
                        text: 'TA', 
                    },
                    xAxis: {
                        categories: table.slice(1).map(row => row[0])
                    },
                    series: table[0].slice(1).map((entity , i) =>{
                        return {
                            name: entity, 
                            data: table.slice(1).map(row => row[i+1]).map(value => value===null?0:value)
                        }
                    }),
                    legend:{
                        align: 'right',
                        verticalAlign: 'middle',
                        layout: 'vertical'
                    }
                })
            }else{
                throw Error("Unable to query result")
            }
        })
    }

    React.useEffect(()=>{
        if(refreshing){
            setQuerying(true)
            queryColumnFunction(columnsList).then(() =>{
                return queryChartFunction(chartSeries)
            }).catch((err)=>{
                console.log(err)
            }).finally(()=>{
                setQuerying(false)
                onDoneRefreshing()
            })
        }
    },[refreshing])

    React.useEffect(()=>{
        //rebuilddatabase2()
        loadColumnsConfig().then((_columnsList) => {
            setQuerying(true)
            return queryColumnFunction(_columnsList)
        }).then(()=>{
            return loadChartsSeriesConfig()
        }).then((_chartSeries)=>{
            return queryChartFunction(_chartSeries)
        }).catch((err)=>{
            console.log(err.message)
        }).finally(()=>{
            setQuerying(false)
            onDoneRefreshing()
        })
    },[])

    return <>
        <div style={{height: '44px', display: 'flex', padding: '0px 10px', alignItems: 'center'}}>
            
            <div style={{flexGrow:1}}></div>
            <div ref={moreTarget} style={{padding: '6px', cursor: 'pointer'}} onClick={()=>setShowMore(true)}>
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
                        <Menu.Item name="export" onClick={()=>{
                            if(chartData.length > 0 && tableData.length > 0 ){
                                let db = new Database()
                                db.excelService([
                                    {operation:'write', data: chartData , row: 1, col: 1},
                                    {operation:'to_table', position: [[1,1],[chartData.length , chartData[0].length]], tablename: 'Table1'},
                                    {operation:'add_line_chart', position: [[1,1],[chartData.length , chartData[0].length]], title:'TA' , height: 15*16 , width: 88*7},
                                    {operation:'change_sheetname', name:'TA_RAW'},
                                    {operation:'add_new_sheet',name:'TA_PERCENTAGE'},
                                    {operation:'write', data: tableData, row: 1, col: 1},
                                    {operation:'merge', row_start: 1 , col_start: tableData[0].length , row_end: 1 , col_end: tableData[1].length},
                                    {operation:'style_cell', position: [1, tableData[0].length], color:15773696},
                                    {operation:'style_cell', position: [[2,1], [2,tableData[1].length]], color:15773696},
                                    {operation:'add_thick_border', position: [[1,1],[tableData.length , tableData[1].length]]},
                                    {operation:'rotate_text_up',position:[[2,1],[2, 4]]},
                                    {operation:'center_wrap_text',position:[[2,1],[2, tableData[1].length]]},
                                    {operation:'format_percentage_bar', position:[[3,5],[tableData.length , tableData[1].length]]},
                                    {operation:'format_percentage', position:[[3,5],[tableData.length , tableData[1].length]]}
                                    
                                ])
                            }
                            setShowMore(false)
                        }}>Export</Menu.Item>
                        <Menu.Item name="chart-setting" onClick={()=>{
                            setShowChartSetting(true)
                            setShowMore(false)
                        }}>Chart setting</Menu.Item>
                        <Menu.Item name="chart-setting" onClick={()=>{
                            setShowTableSetting(true)
                            setShowMore(false)
                        }}>Table setting</Menu.Item>
                    </Menu>
                )}
            </Overlay>
        </div>
        <div style={{height: 'calc( 100vh - 216px )' , display: 'flex'}}>
            {(startDate === null || endDate === null || sites === "") && <Segment placeholder style={{height: 'calc( 100% - 20px)', margin: '10px 0px'}}>
                <Header icon>
                    <Icon name='chart bar' />
                    Specify end date and sites
                </Header>
            
            </Segment>}
            {querying && <div style={{height: 'calc( 100vh - 216px )',width:'100%',zIndex:999,position:'absolute',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{display:'flex',zIndex: 100, alignItems:'center'}}>
                    <Spinner animation="grow"/>
                    <div style={{width:'10px'}}></div>
                    <div>Querying... </div>
                </div>
            </div>}
            <div style={{display:'flex',filter:querying?'blur(1px)':'none',flexGrow:1}}>
                {columnDef.length > 0 && <div className="ag-theme-balham" style={{height: '100%', flexGrow: 1, flexShrink: 0, flexBasis: '50%'}}><AgGridReact 
                            columnDefs = {columnDef}
                            modules={AllCommunityModules}
                            rowData={rowData}
                            onGridReady={(params)=>{
                                params.api.sizeColumnsToFit();
                            }}
                /></div>}
                {chart !== null && <HighchartsReact highcharts={Highcharts} options={chart} 
                        containerProps={{style:{height: '100%', flexGrow: 1, flexShrink: 0, flexBasis: '50%'}}}/>}
            </div>
            
            <SettingModal 
                show={showTableSetting} 
                table={'tatable2'}
                tableQuery={'SELECT tatable2.ID , tatable2.title  , tatable2.formulaid , formulas.name, tatable2.seriesname FROM tatable2 LEFT JOIN formulas ON tatable2.formulaid = formulas.ID'}
                inserNewQuery={`INSERT INTO tatable2 ( title ) VALUES ( 'New TA')`}
                additionQuery={{formulas:'SELECT ID , name from formulas'}}
                tableColumns={[{
                    header:'Title',
                    field: 'title',
                    edit: true,
                    editType: 'text', 
                } , {
                    header: 'Series Name', 
                    field:  'seriesname', 
                    edit: true,
                    editType: 'text',
                } , {
                    header: 'Series',
                    field: 'name',
                    edit: true, 
                    editType: 'selection',
                    editSelection: 'formulas', 
                    key: 'ID', // Key for selection option
                    value: 'formulaid', // map key in selection option to base query column
                    text: 'name',// display text in selection option, 
                }]}
                onHide={()=>setShowTableSetting(false)} 
                refreshing={()=>{
                    loadColumnsConfig().then((_columnsList) => {
                        setQuerying(true)
                        return queryColumnFunction(_columnsList)
                    }).finally(()=>{
                        setQuerying(false)
                        onDoneRefreshing()
                    })
                }}
            />
            <SettingModal 
                show={showChartSetting} 
                table={'tagraph2'}
                tableQuery={'SELECT tagraph2.ID , tagraph2.title  , tagraph2.formulaid , formulas.name, tagraph2.seriesname FROM tagraph2 LEFT JOIN formulas ON tagraph2.formulaid = formulas.ID'}
                inserNewQuery={`INSERT INTO tagraph2 ( title ) VALUES ( 'New TA')`}
                additionQuery={{formulas:'SELECT ID , name from formulas'}}
                tableColumns={[{
                    header:'Title',
                    field: 'title',
                    edit: true,
                    editType: 'text', 
                } , {
                    header: 'Series Name', 
                    field:  'seriesname', 
                    edit: true,
                    editType: 'text',
                } , {
                    header: 'Series',
                    field: 'name',
                    edit: true, 
                    editType: 'selection',
                    editSelection: 'formulas', 
                    key: 'ID', // Key for selection option
                    value: 'formulaid', // map key in selection option to base query column
                    text: 'name',// display text in selection option, 
                }]}
                onHide={()=>setShowChartSetting(false)} 
                refreshing={()=>{
                    loadChartsSeriesConfig().then((_chartSeries)=>{
                        setQuerying(true)
                        return queryChartFunction(_chartSeries)
                    }).finally(()=>{
                        setQuerying(false)
                        onDoneRefreshing()
                    })
                }}
            />
        </div>
        
    </>

}
export default Ta
