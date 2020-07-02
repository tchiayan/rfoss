import React from 'react'

import { Form , Button, Icon , Menu} from 'semantic-ui-react';
import { Overlay } from 'react-bootstrap';
import * as moment from 'moment';

import { pivot , chart} from '../module/Function';
import { Database} from '../Database';
import FreezeContext from '../module/FreezeView';
import AppContext from '../module/AppContext';
import SettingModal from '../module/SettingModal';

import Highcharts from "highcharts";
//import HighchartsCustomEvents from 'highcharts-custom-events';
import HighchartsReact from 'highcharts-react-official';

function TaChart(props){
    const [ startDate , setStartDate ] = React.useState(moment(new Date()).startOf('days').subtract(14,'days').format("YYYY-MM-DD")) //React.useState(moment(new Date()).startOf('days').subtract(15, 'days').format('YYYY-MM-DD'))
    const [ endDate , setEndDate ] = React.useState(moment(new Date()).startOf('days').subtract(1, 'days').format('YYYY-MM-DD'))
    const [ sites , setSites ] = React.useState('1011A')

    const [ chart2gTa , setChart2gTa ] = React.useState(null)
    const [ chart3gTa , setChart3gTa ] = React.useState(null)
    const [ chart4gTa , setChart4gTa ] = React.useState(null)
    const [ chart2gData , setChart2gData ] = React.useState([])
    const [ chart3gData , setChart3gData ] = React.useState([])
    const [ chart4gData , setChart4gData ] = React.useState([])
    const [ setting2g , setSetting2g ] = React.useState(false)
    const [ setting3g , setSetting3g ] = React.useState(false)
    const [ setting4g , setSetting4g ] = React.useState(false)
    const [ chart2gSeries , setChart2gSeries] = React.useState([])
    const [ chart3gSeries , setChart3gSeries] = React.useState([])
    const [ chart4gSeries , setChart4gSeries] = React.useState([])
    const [ chart2gObject , setChart2gObject ] = React.useState([])
    const [ chart2gViewObject, setChart2gViewObject] = React.useState([])
    const [ chart3gObject , setChart3gObject ] = React.useState([])
    const [ chart3gViewObject, setChart3gViewObject] = React.useState([])
    const [ chart4gObject , setChart4gObject ] = React.useState([])
    const [ chart4gViewObject, setChart4gViewObject] = React.useState([])

    const [ showMore , setShowMore ] = React.useState(false)
    const moreTarget = React.useRef(null)
    const freezeContext = React.useContext(FreezeContext)
    const appContext = React.useContext(AppContext)

    let db = new Database()

    const loadSeries = (tablename, onSuccess) => {
        let query = db.query(`SELECT ${tablename}.ID , ${tablename}.title , ${tablename}.formulaid , formulas.name , formulas.formula FROM ${tablename} LEFT JOIN formulas ON ${tablename}.formulaid = formulas.ID `)
        return query.then((response)=>{
            if(response.status === 'Ok'){
                onSuccess(response.result)
                return response.result
            }else{
                throw Error(`Unable to load TA chart series [${tablename}]`)
            }  
        }).catch((error)=>{
            console.log(error)
        })
    }

    const queryChartData = (seriesInfo , objectlevel, tablename , onSuccess) => {
        let query = db.query(`SELECT ${appContext.objectDate.date} as date , ${objectlevel}  as object , ${seriesInfo.map(series => `${series.formula} as [${series.title}]`).join(",")} FROM ${tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${appContext.objectDate.date} ,  ${objectlevel}`)
        console.log(`SELECT ${appContext.objectDate.date} as date , ${objectlevel}  as object , ${seriesInfo.map(series => `${series.formula} as [${series.title}]`).join(",")} FROM ${tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${appContext.objectDate.date} ,  ${objectlevel}`)
        return query.then((response)=>{
            if(response.status === 'Ok'){
                onSuccess(response.result)
                //
                //console.log(pivot(response.result, 'date' , seriesInfo.map(series => series.title)))
                return response.result
            }else{
                throw Error(`Unable to load TA data [${tablename}]`)
            }  
        }).catch((error)=>{
            console.log(error)
        })
    }

    React.useEffect(()=>{
        loadSeries('ta2gchart' , setChart2gSeries)
            .then(() => loadSeries('ta3gchart' , setChart3gSeries))
            .then(() => loadSeries('ta4gchart' , setChart4gSeries))
    }, [])

    
    return <div style={{height:'calc( 100vh - 97px )'}}>
        <div style={{display: 'flex', alignItems: 'center'}}>
            <Form style={{flexGrow:1}}>
                <Form.Group widths="equal">
                    <Form.Input size="small" type='date' label="Start date" max={endDate} value={startDate} onChange={(e,{value})=>setStartDate(value)} />
                    <Form.Input size="small" type='date' label="End date" min={startDate} value={endDate} onChange={(e,{value})=>setEndDate(value)} />
                    <Form.Input defaultValue="1011A" size="small" type='text' label="Site/Cell" placeholder="Enter sites/cell" onBlur={(e)=>setSites(e.target.value)}/> 
                </Form.Group>
            </Form>
            <div style={{marginLeft: '10px'}}><Button onClick={async ()=>{
                freezeContext.setFreeze(true , "Querying... ")
                queryChartData(chart2gSeries , appContext.celllevel , 'TA2G' , (data) => {
                    setChart2gData(data)
                    let allObjects = Array.from(new Set(data.map(row => row.object)))
                    setChart2gObject(allObjects)
                    setChart2gViewObject(allObjects)
                })
                .then((queryData)=>{
                    let dataTable = pivot(queryData, 'date' , chart2gSeries.map(series => series.title) , null , [] , (format) => {
                        return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
                    })
                    let chartConfig = chart(dataTable , '2G TA' , 'line')
                    setChart2gTa(chartConfig)
                })
                .then(() => queryChartData(chart3gSeries , appContext.celllevel , 'TA3G' , (data) => {
                    setChart3gData(data)
                    let allObjects = Array.from(new Set(data.map(row => row.object)))
                    setChart3gObject(allObjects)
                    setChart3gViewObject(allObjects)
                }))
                .then((queryData)=>{

                    let dataTable = pivot(queryData, 'date' , chart3gSeries.map(series => series.title) , null , [] , (format) => {
                        return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
                    })
                    let chartConfig = chart(dataTable , '3G TA' , 'line')
                    setChart3gTa(chartConfig)
                })
                .then(() => queryChartData(chart4gSeries , appContext.celllevel , 'TA4G' , (data) => {
                    setChart4gData(data)
                    let allObjects = Array.from(new Set(data.map(row => row.object)))
                    setChart4gObject(allObjects)
                    setChart4gViewObject(allObjects)
                }))
                .then((queryData)=>{
                    let dataTable = pivot(queryData, 'date' , chart4gSeries.map(series => series.title) , null , [] , (format) => {
                        return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
                    })
                    let chartConfig = chart(dataTable , '4G TA' , 'line')
                    setChart4gTa(chartConfig)
                })
                .finally(()=>{
                    freezeContext.setFreeze(false)
                })
                
            }}>Query</Button></div>
        </div>
        <div style={{display:'flex',height:'calc( 100vh - 97px - 74px )',overflowY:'auto'}}>
            <div style={{flexGrow: 1, flexShrink:0 , flexBasis: '33%'}}>
                <Form>
                    <Form.Select selection multiple value={chart2gViewObject} options={chart2gObject.map(object => ({key:object, value:object, text:object}))} onChange={(e, {value})=>{
                        setChart2gViewObject(value)
                        let dataTable = pivot(chart2gData , 'date' , chart2gSeries.map(series => series.title) , null , value , (format) => {
                            return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
                        })
                        console.log(dataTable)
                        let chartConfig = chart(dataTable , '2G TA' , 'line')
                        setChart2gTa(chartConfig)
                    }}/>
                </Form>
                {chart2gTa !== null &&  <HighchartsReact highcharts={Highcharts} options={chart2gTa} containerProps={{style:{height:'300px'}}} />}
            </div>
            <div style={{flexGrow: 1, flexShrink:0 , flexBasis: '33%'}}>
                <Form>
                    <Form.Select selection multiple value={chart3gViewObject} options={chart3gObject.map(object => ({key:object, value:object, text:object}))} onChange={(e, {value})=>{
                        setChart3gViewObject(value)
                        let dataTable = pivot(chart3gData , 'date' , chart3gSeries.map(series => series.title) , null , value , (format) => {
                            return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
                        })
                        let chartConfig = chart(dataTable , '3G TA' , 'line')
                        setChart3gTa(chartConfig)
                    }}/>
                </Form>
                {chart3gTa !== null &&  <HighchartsReact highcharts={Highcharts} options={chart3gTa} containerProps={{style:{height:'300px'}}} />}
            </div>
            <div style={{flexGrow: 1, flexShrink:0 , flexBasis: '33%'}}>
                <Form>
                    <Form.Select selection multiple value={chart4gViewObject} options={chart4gObject.map(object => ({key:object, value:object, text:object}))} onChange={(e, {value})=>{
                        setChart4gViewObject(value)
                        let dataTable = pivot(chart4gData , 'date' , chart4gSeries.map(series => series.title) , null , value , (format) => {
                            return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
                        })
                        let chartConfig = chart(dataTable , '4G TA' , 'line')
                        setChart4gTa(chartConfig)
                    }}/>
                </Form>
                {chart4gTa !== null &&  <HighchartsReact highcharts={Highcharts} options={chart4gTa} containerProps={{style:{height:'300px'}}} />}
            </div>
        </div>
    </div>
}

export default TaChart