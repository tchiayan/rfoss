import React from 'react';
import { Segment , Header , Icon , Form , Message, Button , Menu  } from 'semantic-ui-react';
import { Modal , Overlay , Spinner } from 'react-bootstrap';

import { Database } from '../Database';
import SettingModal from '../module/SettingModal';
import { pivot } from '../module/Function';

import * as moment from 'moment';
import Highcharts from "highcharts";
import HighchartsCustomEvents from 'highcharts-custom-events';
import HighchartsReact from 'highcharts-react-official';

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

function BiSector(props){
    const { startDate , endDate , sites , setQuerying, querying , refreshing , onDoneRefreshing} = props 
    const [ chartList , setChartList ] = React.useState([])
    const [ charts , setCharts ] = React.useState([])
    const [ chartConfig , setChartConfig ] = React.useState({show: false, min: null , max: null , id: null, axis: 0})
    const [ showMore , setShowMore ] = React.useState(false)
    const [ bisector , setBisector ] = React.useState([])
    const [ celllist , setCelllist ] = React.useState([])
    const [ rowData , setRowData ] = React.useState([])
    const [ showSetting , setShowSetting ] = React.useState(false)
    const moreTarget = React.useRef();

    const loadChartConfig = () => {
        let db = new Database().query(`SELECT bisector.ID , bisector.title , bisector.formulaid , formulas.name , formulas.formula FROM bisector LEFT JOIN formulas ON bisector.formulaid = formulas.ID`)
        return db.then((response)=>{
            if(response.status === 'Ok'){
                setChartList(response.result)
                return response.result
            }else{
                throw Error("Unable to load chart configuration")
            }
        }).catch((err)=>{
            console.log(err)
        })
    }

    
    const updateBisector = (_bisector , _chartlist, data) => {
        // create date range
        let startDateMoment = moment(startDate).clone();
        let endDateMoement = moment(endDate).clone();
        let dateRange = []
        while(endDateMoement.diff(startDateMoment,'days') >= 0){
            dateRange.push(startDateMoment.format('MM/DD/YYYY'))
            startDateMoment.add(1 ,'day')
        }

        let charts = _chartlist.map(chartProps => {
            let table = pivot(data, dateRange , "Entity", chartProps.name, _bisector)
            let chartid = Math.random().toString('26').slice(2)
            return {
                id: chartid, 
                chart:{
                    type:'line',
                    plotBackgroundColor: '#f5f5f5'
                },
                title:{
                    text: chartProps.title, 
                },
                yAxis: [
                    {
                        events:{
                            click: () => {console.log('hahaha')}
                        },
                        labels:{
                            events: {
                                dblclick: function (e) {
                                    //console.log(this)
                                    let min = this.axis.min
                                    let max = this.axis.max
                                    setChartConfig({show: true , min: min , max: max , chartId: chartid, axis: 0})
                                    //console.log('hehehe')
                                }
                            }
                        }
                    }
                ],
                xAxis: {
                    categories: table.slice(1).map(row => row[0])
                },
                series: table[0].slice(1).map((entity , i) =>{
                    return {
                        name: entity, 
                        data: table.slice(1).map(row => row[i+1])
                    }
                }),
                tooltip:{
                    formatter: function(){
                        let date = this.x // string 
                        let value = this.y // value 
                        let name = this.series.name
                        let bhtime = data.find(row => row.Entity === name && row.key === date) ? data.find(row => row.Entity === name && row.key === date).bhtime : "No data"
                        return "<em>" + date + "</em><br />" + name + ":<b>" + value + "</b><br />BH Hour: <b>" + bhtime + "</b>" ;
                    }
                }
            }
        })
        setCharts(charts)
    }
    
    const queryFunction = (_chartList) => {
        setQuerying(true)
        let queryString = `SELECT strftime('%m/%d/%Y',Date([Date])) as key , strftime('%H:%M', [time]) as [bhtime], substr([Cell_Name],0,9) as [Entity] , ${_chartList.map(config => `${config.formula} AS [${config.name}]`).join(",")} FROM main WHERE ([Date] between '${startDate}' and  '${endDate}') and [Cell_Name] LIKE '${sites}%' GROUP BY Date([Date]) , substr([Cell_Name],0,9)` 
        
        let db = new Database().query(queryString)
        db.then((response)=>{
            if(response.status === 'Ok'){
                let _celllist = Array.from(new Set(response.result.map(row => row.Entity)))
                setCelllist(_celllist)

                if(_celllist.length >= 2){
                    let _bisector  = _celllist.slice(0,2)
                    
                    setBisector(_bisector)
                    setRowData(response.result)
                    updateBisector(_bisector , _chartList , response.result )

                }
                
            }else{
                throw Error("Unable to query result")
            }
        }).catch((error)=>{
            console.log(error)
        }).finally(()=>{
            setQuerying(false)
            onDoneRefreshing()
        })
    }

    React.useEffect(()=>{
        if(refreshing){
            queryFunction(chartList)
        }
    },[refreshing])

    React.useEffect(()=>{
        loadChartConfig().then((_chartlist) => {
            return queryFunction(_chartlist)
        })
    },[])

    return <>
        <div style={{height: '44px', position: 'relative', display: 'flex', padding: '0px 10px', alignItems: 'center'}}>
            
            <div style={{flexGrow:1}}></div>
            <Form>
                <Form.Select inline label="Bisector" size="mini" selection multiple value={bisector} options={celllist.map(cell => ({key:cell,value:cell,text:cell}))} onChange={(e,{value})=>{setBisector(value);updateBisector(value , chartList, rowData)}} />
            </Form>
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
                        <Menu.Item name="export-excel" disabled={charts.length === 0}onClick={()=>{
                            let db = new Database()
                            db.excelService([
                                {operation:'chart',highchart:charts}
                            ])
                            setShowMore(false)
                        }}>Export to excel</Menu.Item>
                        <Menu.Item name="chart-setting" onClick={()=>{
                            setShowSetting(true)
                            setShowMore(false)
                        }}>Chart setting</Menu.Item>
                    </Menu>
                )}
            </Overlay>
        </div>
        {charts.length === 0 && !querying &&  <Segment placeholder style={{height: 'calc( 100% - 20px)', margin: '10px 0px'}}>
            <Header icon>
                <Icon name='chart bar' />
                Specify start date , end date and sites
            </Header>
        
        </Segment>}
        {querying && <div style={{height: 'calc( 100vh - 216px )',width:'100%',zIndex:999,position:'absolute',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{display:'flex',zIndex: 100, alignItems:'center'}}>
                <Spinner animation="grow"/>
                <div style={{width:'10px'}}></div>
                <div>Querying... </div>
            </div>
        </div>}
        {charts.length > 0 && <div style={{height:'calc( 100vh - 216px )',display:'flex', flexFlow: 'row wrap', justifyContent: 'space-evenly',filter:querying?'blur(1px)':'none', overflowY:'auto'}}>
            {charts.map((chart,id) => <HighchartsReact key={id} highcharts={Highcharts} options={chart} containerProps={{style:{height:'calc( 90vh - 196px )', flexShrink: 0, flexBasis: '50%'}}}/>)}
        </div>}
        <ChartConfigModal show={chartConfig.show} onHide={()=>{
            setChartConfig({show: false , min:null , max: null , chartId: null, axis: 0})
        }} min={chartConfig.min} max={chartConfig.max} chartId={chartConfig.chartId} axis={chartConfig.axis} changeScale={(id , min , max, axis)=>{
            let _charts = charts.slice() 
            let _chart = _charts.find(ch => ch.id === id)
            _chart.yAxis[axis]['min'] = min 
            _chart.yAxis[axis]['max'] = max
            setCharts(_charts)
        }}/>
        <SettingModal 
            show={showSetting} 
            table={'bhmain'}
            tableQuery={'SELECT bisector.ID , bisector.title  , bisector.formulaid , formulas.name FROM bisector LEFT JOIN formulas ON bisector.formulaid = formulas.ID'}
            inserNewQuery={`INSERT INTO bisector ( title ) VALUES ( 'New chart title')`}
            additionQuery={{formulas:'SELECT ID , name from formulas'}}
            tableColumns={[{
                header:'Title',
                field: 'title',
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
            onHide={()=>setShowSetting(false)} 
            refreshing={()=>{
                loadChartConfig().then((_chartlist) => {
                    return queryFunction(_chartlist)
                })
            }}
        />
        {/*<div style={{height: 'calc( 100vh - 216px )', position:'relative' , overflowY: 'auto'}}>
            
            
        </div>*/}
        
    </>

}
export default BiSector

