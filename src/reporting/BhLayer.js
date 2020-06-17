import React from 'react';
import { Segment , Header , Icon , Form , Message, Button , Menu} from 'semantic-ui-react';
import { Modal , Overlay, Spinner} from 'react-bootstrap';
//import Toast from './../module/ToastAlert';

import * as moment from 'moment';

import { Database} from '../Database';
import SettingModal from '../module/SettingModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { pivot } from '../module/Function';
import FreezeContext from '../module/FreezeView';

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

function BhLayer(props){
    const { startDate , endDate , sites , querying, setQuerying , refreshing , onDoneRefreshing} = props 
    const [ chartList , setChartList ] = React.useState([])
    const [ charts , setCharts ] = React.useState([])
    const [ chartsData , setChartsData ] = React.useState([])
    const [ chartConfig , setChartConfig ] = React.useState({show: false, min: null , max: null , id: null, axis: 0})
    const [ chartSetting , setChartSetting ] = React.useState(false)
    const [ showMore , setShowMore ] = React.useState(false)
    const freezeContext = React.useContext(FreezeContext)
    const moreTarget = React.useRef();

    const loadChartConfig = () => {
        let db = new Database().query(`SELECT bhlayer.ID , bhlayer.title , formulas.name , formulas.formula FROM bhlayer LEFT JOIN formulas ON bhlayer.formulaid = formulas.ID`)
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
        console.log(`Query chart`)
        setQuerying(true)
        let queryString = `SELECT strftime('%m/%d/%Y',Date([Date])) as key , strftime('%H:%M', [time]) as [bhtime], substr([Cell_Name],0,9) as [Entity] , ${_chartList.map(config => `${config.formula} AS [${config.name}]`).join(",")} FROM main WHERE ( [Date] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:MM:SS")}' ) and [Cell_Name] LIKE '${sites}%' GROUP BY Date([Date]) , substr([Cell_Name],0,9)` 
        
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

                //let celllist = Array.from(new Set(response.result.map(row => row.Entity)))
                let sectors = response.result.reduce((group, row) => {
                    let matching = row.Entity.match(/\w{6}_(\w)/)
                    //console.log(row.Entity.match(/\w{6}_(\w{2})/))
                    if(matching){
                        if(matching[1] in group){
                            group[matching[1]].push(row)
                        }else{
                            group[matching[1]] = [row]
                        }
                    }

                    return group
                },{})

                let charts = Object.values(sectors).map(rows => {
                    let groupSectorChart = _chartList.map(chartProps => {
                        let table = pivot(rows, dateRange , "Entity", chartProps.name)
                        let chartid = Math.random().toString('26').slice(2)
                        return {
                            id: chartid, 
                            chart:{
                                type:'line',
                                animation: false,
                                //backgroundColor: '#edf0f2',
                                plotBackgroundColor: '#f5f5f5' //'#edf0f2' , //'#FCFFC5'
                            },
                            title:{
                              text: chartProps.title, 
                            },
                            yAxis: [
                                {
                                    min: 0, 
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
                            series:table[0].slice(1).map((entity , i) =>{
                              return {name: entity, data:table.slice(1).map(row => row[i+1])}
                            }),
                            tooltip:{
                                formatter: function(){
                                    let date = this.x // string 
                                    let value = this.y // value 
                                    let name = this.series.name
                                    let bhtime = response.result.find(row => row.Entity === name && row.key === date) ? response.result.find(row => row.Entity === name && row.key === date).bhtime : "No data"
                                    return "<em>" + date + "</em><br />" + name + ":<b>" + value + "</b><br />BH Hour: <b>" + bhtime + "</b>" ;
                                }
                            },
                            plotOptions: {
                                series: {
                                    animation: false
                                }
                            }
                        }
                    })

                    return {
                        chartOptions: groupSectorChart
                    }

                    
                })

                let exportCharts = _chartList.map(chartProps => {
                    let groupSectorChart = Object.values(sectors).map(rows => {
                        let table = pivot(rows, dateRange , "Entity", chartProps.name)
                        let chartid = Math.random().toString('26').slice(2)
                        return {
                            id: chartid, 
                            chart:{
                                type:'line',
                                animation: false,
                            },
                            title:{
                              text: chartProps.title, 
                            },
                            yAxis: [
                                {
                                    min: 0, 
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
                            series:table[0].slice(1).map((entity , i) =>{
                              return {name: entity, data:table.slice(1).map(row => row[i+1])}//.map(value => value === null ? "" : value)}
                            })
                        }
                    })

                    return {
                        chartOptions: groupSectorChart
                    }

                    
                })

                setChartsData(exportCharts.map(chart => chart.chartOptions))
                setCharts(charts.map(chart => chart.chartOptions.reduce((list, _c)=>{
                    if(list.length === 0){
                        list.push({section:true,data:[_c]})
                    }else{
                        if(list[list.length-1].data.length === 2){
                            list.push({section:false,data:[_c]})
                        }else{
                            list[list.length-1].data.push(_c)
                        }
                    }
                    
                    //if(list[list.length-1].length === 2){
                    //    list.push([_c])
                    //}else{
                    //    list[list.length-1].push(_c)
                    //}
                    return list
                },[])).flatMap(_chart => _chart))
                //setCharts(charts.flatMap(chart => chart.chartOptions))
            }else{
                throw Error("Unable to query result")
            }
        }).catch((error)=>{
            console.log(error)
        }).finally(()=>{
            console.log(`Set querying false`)
            setQuerying(false)
            onDoneRefreshing()
        })
    }

    React.useEffect(()=>{
        console.log(`Receive refreshing signal ${refreshing}`)
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
                        <Menu.Item name="chart-export" onClick={()=>{
                            freezeContext.setFreeze(true, 'Exporting...')
                            let db = new Database()
                            console.log(chartsData)
                            db.excelService([
                                {operation:'chart',highchart:chartsData}
                            ]).then((response)=>{
                                console.log(response)
                                freezeContext.setFreeze(false)
                            })
                            setShowMore(false)
                        }}>Export to excel</Menu.Item>
                        <Menu.Item name="chart-setting" onClick={()=>{
                            setChartSetting(true)
                            setShowMore(false)
                        }}>Chart setting</Menu.Item>
                    </Menu>
                )}
            </Overlay>
        </div>
        {charts.length === 0 && !querying && <Segment placeholder style={{height: 'calc( 100vh - 244px )', margin: '10px 0px'}}>
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
        {charts.length !== 0 &&
            <div style={{height: 'calc( 100vh - 216px )',filter:querying?'blur(1px)':'none'}}>
                <AutoSizer> 
                    {({ height , width }) => <List height={height} itemCount={charts.length} itemSize={Math.round(height*0.9)} width={width}>
                        {({index, style})=>{
                            return <div style={{...style , display: 'flex',justifyContent:'center',borderTop:charts[index].section && index !== 0?'1px solid #d0d0d0':'none'}}>
                                {charts[index].data.map((_c,_ci) => <HighchartsReact key={_ci} highcharts={Highcharts} options={_c} containerProps={{style:{flexBasis:'50%'}}}/>)}
                            </div>
                        }}
                    </List>}
                </AutoSizer>
            </div>
            
        }
        <ChartConfigModal show={chartConfig.show} onHide={()=>{
            setChartConfig({show: false , min:null , max: null , chartId: null, axis: 0})
        }} min={chartConfig.min} max={chartConfig.max} chartId={chartConfig.chartId} axis={chartConfig.axis} changeScale={(id , min , max, axis)=>{
            let _charts = charts.slice() 
            console.log(_charts)
            console.log(id)
            let _chart = _charts.flatMap(ch => ch['data']).find(ch => ch.id === id)
            console.log(_chart)
            _chart.yAxis[axis]['min'] = min 
            _chart.yAxis[axis]['max'] = max
            setCharts(_charts)
        }}/>
        <SettingModal 
            show={chartSetting} 
            table={'bhlayer'}
            tableQuery={'SELECT bhlayer.ID , bhlayer.title  , bhlayer.formulaid , formulas.name FROM bhlayer LEFT JOIN formulas ON bhlayer.formulaid = formulas.ID'}
            inserNewQuery={`INSERT INTO bhlayer ( title ) VALUES ( 'New chart title')`}
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
            onHide={()=>setChartSetting(false)} 
            refreshing={()=>{
                loadChartConfig().then((_chartlist) => {
                    return queryFunction(_chartlist)
                })
            }}
        />
    </>
}

export default BhLayer