import React from 'react';
import { Segment , Header , Icon , Form , Message, Button , Menu } from 'semantic-ui-react';
import { Modal , Overlay , Spinner } from 'react-bootstrap';

import { Database } from '../Database';
import SettingModal from '../module/SettingModal';
import { pivot } from '../module/Function';
import * as moment from 'moment'
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

function BhMain(props){
    const { startDate , endDate , sites , setQuerying , querying , refreshing , onDoneRefreshing} = props 
    const [ chartList , setChartList ] = React.useState([])
    const [ charts , setCharts ] = React.useState([])
    const [ chartConfig , setChartConfig ] = React.useState({show: false, min: null , max: null , id: null, axis: 0})
    const [ chartSetting , setChartSetting ] = React.useState(false)
    const [ showMore , setShowMore ] = React.useState(false)
    const moreTarget = React.useRef(null)

    const loadChartConfig = () => {
        let db = new Database().query(`SELECT bhmain.ID , bhmain.title , formulas.name , formulas.formula , bhmain.baselinetitle , bhmain.baselinevalue FROM bhmain LEFT JOIN formulas ON bhmain.formulaid = formulas.ID`)
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

    const queryFunction = (_chartList) => {
        setQuerying(true)
        let queryString = `SELECT strftime('%m/%d/%Y',Date([Date])) as key , strftime('%H:%M', [time]) as [bhtime], substr([Cell_Name],0,9) as [Entity] , ${_chartList.map(config => `${config.formula} AS [${config.name}]`).join(",")} FROM main WHERE ([Date] between '${startDate}' and '${endDate}') and [Cell_Name] LIKE '${sites}%' GROUP BY Date([Date]) , substr([Cell_Name],0,9)` 
        let db = new Database().query(queryString)
        db.then((response)=>{
            if(response.status === 'Ok'){
                // create date range
                let startDateMoment = moment(startDate).clone();
                let endDateMoement = moment(endDate).clone();
                let dateRange = []
                while(endDateMoement.diff(startDateMoment,'days') >= 0){
                    dateRange.push(startDateMoment.format('MM/DD/YYYY'))
                    startDateMoment.add(1 ,'day')
                }

                let charts = _chartList.map(chartProps => {
                    let table = pivot(response.result, dateRange , "Entity", chartProps.name)
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
                        series:[
                            ...table[0].slice(1).map((entity , i) =>{
                                return {
                                    name: entity, 
                                    data:[
                                        ...table.slice(1).map(row => row[i+1]),
                                        
                                    ]
                                }
                            }),
                            ...(chartProps.baselinetitle && chartProps.baselinevalue? [
                                {name:chartProps.baselinetitle,data:table.slice(1).map( _ => chartProps.baselinevalue),dashStyle:'dash',marker:{enabled:false},color:'red'}
                            ] : [])
                        ],
                        legend:{
                            align: 'right',
                            verticalAlign: 'middle',
                            layout: 'vertical'
                        },
                        tooltip:{
                            formatter: function(){
                                let date = this.x // string 
                                let value = this.y // value 
                                let name = this.series.name
                                let bhtime = response.result.find(row => row.Entity === name && row.key === date) ? response.result.find(row => row.Entity === name && row.key === date).bhtime : "No data"
                                return "<em>" + date + "</em><br />" + name + ":<b>" + value + "</b><br />BH Hour: <b>" + bhtime + "</b>" ;
                            }
                        }
                    }
                })

                setCharts(charts)
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
            //console.log(chartList)
            queryFunction(chartList)
        }
    },[refreshing])

    React.useEffect(()=>{
        //rebuilddatabase()
        loadChartConfig().then((_chartlist) => {
            return queryFunction(_chartlist)
        })
    },[])

    return <>
        <div style={{height: '44px', position:'relative', display: 'flex', padding: '0px 10px', alignItems: 'center'}}>
            
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
                        <Menu.Item name="chart-setting" onClick={()=>{
                            setChartSetting(true)
                            setShowMore(false)
                        }}>Chart setting</Menu.Item>
                        <Menu.Item name="export-excel" onClick={()=>{
                            let db = new Database()
                            db.excelService([
                                {operation:'chart',highchart:charts}
                            ])
                            setShowMore(false)
                        }}>Export to excel</Menu.Item>
                    </Menu>
                )}
            </Overlay>
        </div>
        {querying && <div style={{height: 'calc( 100vh - 216px )',width:'100%',zIndex:999,position:'absolute',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{display:'flex',zIndex: 100, alignItems:'center'}}>
                <Spinner animation="grow"/>
                <div style={{width:'10px'}}></div>
                <div>Querying... </div>
            </div>
        </div>}
        {charts.length === 0 && !querying && <Segment placeholder style={{height: 'calc( 100vh - 216px )', margin: '10px 0px'}}>
             <Header icon>
                <Icon name='chart bar' />
                Specify start date , end date and sites
            </Header>
        
        </Segment>}
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
            show={chartSetting} 
            table={'bhmain'}
            tableQuery={'SELECT bhmain.ID , bhmain.title  , bhmain.formulaid , formulas.name, bhmain.baselinetitle , bhmain.baselinevalue FROM bhmain LEFT JOIN formulas ON bhmain.formulaid = formulas.ID'}
            inserNewQuery={`INSERT INTO bhmain ( title ) VALUES ( 'New chart title')`}
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
            } , {
                header: 'Baseline Title', 
                field: 'baselinetitle', 
                edit: true,
                editType: 'text',
            }, {
                header: 'Baseline Value', 
                field:  'baselinevalue', 
                edit: true,
                editType: 'text',
            }]}
            onHide={()=>setChartSetting(false)} 
            refreshing={()=>{
                loadChartConfig().then((_chartlist) => {
                    return queryFunction(_chartlist)
                })
            }}
        />
    </>
}

export default BhMain