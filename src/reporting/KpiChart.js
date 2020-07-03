import React from 'react'

import { Form , Button, Icon , Menu} from 'semantic-ui-react';
import { Overlay } from 'react-bootstrap';
import * as moment from 'moment';

import { pivot , chart , ChartConfigModal } from '../module/Function';
import { Database} from '../Database';
import FreezeContext from '../module/FreezeView';
import AppContext from '../module/AppContext';
import SettingModal from '../module/SettingModal';

import Highcharts from "highcharts";
//import HighchartsCustomEvents from 'highcharts-custom-events';
import HighchartsReact from 'highcharts-react-official';
const aggregationMethod = ['avg' , 'sum']

function KPIChart(props){
    //const { title , setTitle} = props 
    //React.useEffect(()=>{setTitle(title)},[title])

    const [ startDate , setStartDate ] = React.useState(moment(new Date()).startOf('days').subtract(14,'days').format("YYYY-MM-DD")) //React.useState(moment(new Date()).startOf('days').subtract(15, 'days').format('YYYY-MM-DD'))
    const [ endDate , setEndDate ] = React.useState(moment(new Date()).startOf('days').subtract(1, 'days').format('YYYY-MM-DD'))
    const [ sites , setSites ] = React.useState('1011A')
    const [ chart2GProps , set2GChartProps ] = React.useState([])
    const [ chart3GProps , set3GChartProps ] = React.useState([])
    const [ chart4GProps , set4GChartProps ] = React.useState({})
    const [ chartBlendedProps , setBlendedChartProps ] = React.useState([])
    const [ chartBlendedDataProps , setBlendedDataChartProps ] = React.useState([])
    const [ showMore , setShowMore ] = React.useState(false)
    const [ chart2GSetting , setChart2GSetting ] = React.useState(false) // setting modal
    const [ chart3GSetting , setChart3GSetting ] = React.useState(false) // setting modal
    const [ chart4GSetting , setChart4GSetting ] = React.useState(false) // setting modal
    const [ chartBlendedSetting , setChartBlendedSetting ] = React.useState(false) // setting modal
    const [ chartBlendedDataSetting , setChartBlendedDataSetting ] = React.useState(false)
    const [ chart2GList , setChart2GList ] = React.useState([]) // chart setting list
    const [ chart3GList , setChart3GList ] = React.useState([]) // chart setting list 
    const [ chart4GList , setChart4GList ] = React.useState([]) // chart setting list
    const [ chartBlendedList , setChartBlendedList ] = React.useState(null) // chart setting list
    const [ chartBlendedDataList , setChartBlendedDataList ] = React.useState(null)
    const [ chart2GConfig , setChart2GConfig ] = React.useState({show: false, min: null , max: null , chartId: null, save: null})
    const [ chart3GConfig , setChart3GConfig ] = React.useState({show: false, min: null , max: null , chartId: null, save: null})
    const [ chart4GConfig , setChart4GConfig ] = React.useState({show: false, min: null , max: null , chartId: null, save: null})
    const [ chartBlendedConfig , setChartBlendedConfig ] = React.useState({show: false, min: null , max: null , chartId: null, save: null})
    const moreTarget = React.useRef(null)
    const freezeContext = React.useContext(FreezeContext)
    const appContext = React.useContext(AppContext)

    let db = new Database()

    const load2GChartConfig = () => {
        let query = db.query(`SELECT antennaswap2g.ID , antennaswap2g.title  , antennaswap2g.formatting , antennaswap2g.formulaid , formulas.name , formulas.formula , formulas.tablename , antennaswap2g.grouplevel FROM antennaswap2g LEFT JOIN formulas ON antennaswap2g.formulaid = formulas.ID`)
        return query.then((response)=>{
            if(response.status === 'Ok'){
                setChart2GList(response.result)
                return response.result
            }else{
                throw Error("Unable to load chart configuration")
            }
        }).catch((err)=>{
            console.log(err)
        })
    }

    const load3GChartConfig = () => {
        let query = db.query(`SELECT antennaswap3g.ID , antennaswap3g.title  , antennaswap3g.formatting , antennaswap3g.formulaid , formulas.name , formulas.formula , formulas.tablename , antennaswap3g.grouplevel FROM antennaswap3g LEFT JOIN formulas ON antennaswap3g.formulaid = formulas.ID`)
        return query.then((response)=>{
            if(response.status === 'Ok'){
                setChart3GList(response.result)
                return response.result
            }else{
                throw Error("Unable to load chart configuration")
            }
        }).catch((err)=>{
            console.log(err)
        })
    }

    const load4GChartConfig = () => {
        let query = db.query(`SELECT antennaswap4g.ID , antennaswap4g.title  , antennaswap4g.formatting , antennaswap4g.formulaid , formulas.name , formulas.formula , formulas.tablename , antennaswap4g.grouplevel FROM antennaswap4g LEFT JOIN formulas ON antennaswap4g.formulaid = formulas.ID`)
        return query.then((response)=>{
            if(response.status === 'Ok'){
                setChart4GList(response.result)
                return response.result
            }else{
                throw Error("Unable to load chart configuration")
            }
        }).catch((err)=>{
            console.log(err)
        })
    }

    const loadBlendedChartConfig = () => {
        let query = db.query(`SELECT antennaswapblended.ID , antennaswapblended.title  , antennaswapblended.formulaid , formulas.name , formulas.formula , formulas.tablename FROM antennaswapblended LEFT JOIN formulas ON antennaswapblended.formulaid = formulas.ID`)
        return query.then(async (response)=>{
            if(response.status === 'Ok'){
                let blendedSetting = response.result
                let rawcounter = []
                blendedSetting.forEach(setting  => {
                    let regex = RegExp(`(${aggregationMethod.join("|")})\\((?<counter>\\w+)\\)`, 'g')
                    rawcounter.push(...Array.from(setting.formula.matchAll(regex)).map(matched => ({counter:matched.groups.counter, tablename:setting.tablename})))
                })

                // refactor combined tablename
                loop1:
                for(let i = 0 ; i < rawcounter.length ; i++){
                    if(rawcounter[i].tablename.split(";").length > 1){
                        let possibleTable = rawcounter[i].tablename.split(";")
                        for(let j=0; j < possibleTable.length; j++){
                            let tableCheck = await db.query(`SELECT name FROM pragma_table_info("${possibleTable[j]}") WHERE name = '${rawcounter[i].counter}'`)
                            if(tableCheck.status === 'Ok'){
                                if(tableCheck.result.length > 0){
                                    //console.log(`raw counter ${rawcounter[i].counter} is belong to ${possibleTable[j]}`)
                                    rawcounter[i].tablename = possibleTable[j]
                                    continue loop1
                                }
                            }
                        }
                    }
                }
                let basequery = rawcounter.reduce((group , counterInfo) => {
                    if(!Object.keys(group).includes(counterInfo.tablename)){
                        group[counterInfo.tablename] = [counterInfo.counter]
                    }else if(!group[counterInfo.tablename].includes(counterInfo.counter)){
                        group[counterInfo.tablename].push(counterInfo.counter)
                    }
                    return group
                }, {})
                
                let baseCommand = Object.entries(basequery).reduce((command ,[table , counters] , index) => {
                    return command + `${command!==''? ' JOIN' : ''} ( SELECT ${appContext.objectDate.date} , ${counters.map(counter => `sum(${counter}) as [${counter}]`).join(",")}  FROM ${table} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' )  and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${appContext.objectDate.date} ) table${index+1} ${command!==''? `ON table${index}.${appContext.objectDate.date} = table${index+1}.${appContext.objectDate.date}`: ''} `
                }, "")

                setChartBlendedList({
                    series: blendedSetting, 
                    basequery: basequery, 
                    queryCommand: `SELECT table1.${appContext.objectDate.date} , ${blendedSetting.map(setting => `${setting.formula} as [${setting.title}]`).join(" , ")} FROM ${baseCommand} GROUP BY table1.${appContext.objectDate.date}`, 
                    baseCommand: baseCommand
                })

                return {
                    series: blendedSetting, 
                    basequery: basequery, 
                    queryCommand: `SELECT table1.${appContext.objectDate.date} , ${blendedSetting.map(setting => `${setting.formula} as [${setting.title}]`).join(" , ")} FROM ${baseCommand} GROUP BY table1.${appContext.objectDate.date}`, 
                    baseCommand: baseCommand
                }

            }else{
                throw Error("Unable to load chart configuration")
            }
        }).catch((err)=>{
            console.log(err)
        })
    }

    const loadBlendedDataChartConfig = () => {
        let query = db.query(`SELECT antennaswapblendeddata.ID , antennaswapblendeddata.title  , antennaswapblendeddata.formulaid , formulas.name , formulas.formula , formulas.tablename FROM antennaswapblendeddata LEFT JOIN formulas ON antennaswapblendeddata.formulaid = formulas.ID`)
        return query.then(async (response)=>{
            if(response.status === 'Ok'){
                let blendedSetting = response.result
                let rawcounter = []
                blendedSetting.forEach(setting  => {
                    let regex = RegExp(`(${aggregationMethod.join("|")})\\((?<counter>\\w+)\\)`, 'g')
                    rawcounter.push(...Array.from(setting.formula.matchAll(regex)).map(matched => ({counter:matched.groups.counter, tablename:setting.tablename})))
                })

                // refactor combined tablename
                loop1:
                for(let i = 0 ; i < rawcounter.length ; i++){
                    if(rawcounter[i].tablename.split(";").length > 1){
                        let possibleTable = rawcounter[i].tablename.split(";")
                        for(let j=0; j < possibleTable.length; j++){
                            let tableCheck = await db.query(`SELECT name FROM pragma_table_info("${possibleTable[j]}") WHERE name = '${rawcounter[i].counter}'`)
                            if(tableCheck.status === 'Ok'){
                                if(tableCheck.result.length > 0){
                                    //console.log(`raw counter ${rawcounter[i].counter} is belong to ${possibleTable[j]}`)
                                    rawcounter[i].tablename = possibleTable[j]
                                    continue loop1
                                }
                            }
                        }
                    }
                }
                let basequery = rawcounter.reduce((group , counterInfo) => {
                    if(!Object.keys(group).includes(counterInfo.tablename)){
                        group[counterInfo.tablename] = [counterInfo.counter]
                    }else if(!group[counterInfo.tablename].includes(counterInfo.counter)){
                        group[counterInfo.tablename].push(counterInfo.counter)
                    }
                    return group
                }, {})
                
                let baseCommand = Object.entries(basequery).reduce((command ,[table , counters] , index) => {
                    return command + `${command!==''? ' JOIN' : ''} ( SELECT ${appContext.objectDate.date} , ${counters.map(counter => `sum(${counter}) as [${counter}]`).join(",")}  FROM ${table} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' )  and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${appContext.objectDate.date} ) table${index+1} ${command!==''? `ON table${index}.${appContext.objectDate.date} = table${index+1}.${appContext.objectDate.date}`: ''} `
                }, "")

                setChartBlendedList({
                    series: blendedSetting, 
                    basequery: basequery, 
                    queryCommand: `SELECT table1.${appContext.objectDate.date} , ${blendedSetting.map(setting => `${setting.formula} as [${setting.title}]`).join(" , ")} FROM ${baseCommand} GROUP BY table1.${appContext.objectDate.date}`, 
                    baseCommand: baseCommand
                })

                return {
                    series: blendedSetting, 
                    basequery: basequery, 
                    queryCommand: `SELECT table1.${appContext.objectDate.date} , ${blendedSetting.map(setting => `${setting.formula} as [${setting.title}]`).join(" , ")} FROM ${baseCommand} GROUP BY table1.${appContext.objectDate.date}`, 
                    baseCommand: baseCommand
                }

            }else{
                throw Error("Unable to load chart configuration")
            }
        }).catch((err)=>{
            console.log(err)
        })
    }

    const query2GChart = async (_chartlist) => {
        let _chartProps = []
        for(let i=0; i < _chartlist.length ; i++){
            let query = await db.query(`SELECT ${appContext.objectDate.date} as date , ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel}  as object , ${_chartlist[i].formula} as ${_chartlist[i].name} FROM ${_chartlist[i].tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${appContext.objectDate.date} ,  ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel} `)
            //console.log(`SELECT ${appContext.objectDate.date} as date , ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel}  as object , ${_chartlist[i].formula} as ${_chartlist[i].name} FROM ${_chartlist[i].tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${appContext.objectDate.date} ,  ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel} `)
            //console.log(query)
            //let layer = query.result
            //console.log(_chartlist[i])
            if(query.status === 'Ok'){
                //console.log(query.result)
                let datatable = pivot(query.result , 'date', 'object', _chartlist[i].name , [] , (format) => {
                    return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
                })
                //console.log(datatable)
                let id = Math.random().toString('26').slice(2)
                let chartProp = chart(datatable , _chartlist[i].title, 'line' , {
                    chartid: id,
                    excelLineWidth: 2.25, 
                    primaryAxisFormat:_chartlist[i].formatting, 
                    primaryAxisEvent: {
                        dblclick: function(e) {
                            let min = this.axis.min 
                            let max = this.axis.max 
                            setChart2GConfig({
                                show: true , 
                                min: min , 
                                max: max , 
                                chartId: id , 
                                save: (chartId , minValue , maxValue , chartlist) => {
                                    let _chartList = chartlist.slice()
                                    let _chart = _chartList.find(chart => chart.id === chartId)
                                    console.log(_chartList)
                                    if(_chart){
                                        console.log(`Saving chart [${chartId}] from`)
                                        console.log(_chartList)
                                        _chart.yAxis[0]['min'] = minValue
                                        _chart.yAxis[0]['max'] = maxValue
                                        set2GChartProps(_chartList)
                                    }
                                }
                            })
                        }
                    }
                })
                //console.log(chartProp)
                _chartProps.push(chartProp)
            }
        }

        return _chartProps
        //set2GChartProps(_chartProps)
    }

    const query3GChart = async (_chartlist) => {
        let _chartProps = []
        for(let i=0; i < _chartlist.length ; i++){
            let query = await db.query(`SELECT ${appContext.objectDate.date} as date , ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel}  as object , ${_chartlist[i].formula} as ${_chartlist[i].name} FROM ${_chartlist[i].tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${appContext.objectDate.date} ,  ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel} `)
            //console.log(`SELECT ${appContext.objectDate.date} as date , ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel}  as object , ${_chartlist[i].formula} as ${_chartlist[i].name} FROM ${_chartlist[i].tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${appContext.objectDate.date} ,  ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel} `)
            //console.log(query)
            //let layer = query.result
            //console.log(_chartlist[i])
            if(query.status === 'Ok'){
                //console.log(query.result)
                let datatable = pivot(query.result , 'date', 'object', _chartlist[i].name , [] , (format) => {
                    return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
                })
                //console.log(datatable)
                let id = Math.random().toString('26').slice(2)
                let chartProp = chart(datatable , _chartlist[i].title, 'line' , {
                    chartid: id,
                    excelLineWidth: 2.25, 
                    primaryAxisFormat:_chartlist[i].formatting, 
                    primaryAxisEvent: {
                        dblclick: function(e) {
                            let min = this.axis.min 
                            let max = this.axis.max 
                            setChart3GConfig({
                                show: true , 
                                min: min , 
                                max: max , 
                                chartId: id , 
                                save: (chartId , minValue , maxValue , chartlist) => {
                                    let _chartList = chartlist.slice()
                                    let _chart = _chartList.find(chart => chart.id === chartId)
                                    console.log(_chartList)
                                    if(_chart){
                                        console.log(`Saving chart [${chartId}] from`)
                                        console.log(_chartList)
                                        _chart.yAxis[0]['min'] = minValue
                                        _chart.yAxis[0]['max'] = maxValue
                                        set3GChartProps(_chartList)
                                    }
                                }
                            })
                        }
                    }
                })
                //console.log(chartProp)
                _chartProps.push(chartProp)
            }
        }

        return _chartProps
        //set2GChartProps(_chartProps)
    }

    const queryLayerChart = async (_chartlist) => {
        let _chartProps = {}
        const layerDefinition = {
            1: 'L26',
            2: 'L18',
            5: 'L09',
            7: 'L21'
        }

        for(let i=0; i < _chartlist.length ; i++){
            let query = await db.query(`SELECT ${appContext.objectDate.date} as date , ${appContext.celllevel}  as object , ${_chartlist[i].formula} as ${_chartlist[i].name} FROM ${_chartlist[i].tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${appContext.objectDate.date} ,  ${appContext.celllevel} `)
            //console.log(`SELECT ${appContext.objectDate.date} as date , ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel}  as object , ${_chartlist[i].formula} as ${_chartlist[i].name} FROM ${_chartlist[i].tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel} `)
            //console.log(query)
            //console.log(_chartlist[i])
            if(query.status === 'Ok'){
                
                let layers = query.result.reduce((group, row) => {
                    let matching = row.object.match(/\d{4}\w\_?\d?-\w{2}(\d)[\d|\w]/)
                    //console.log(row.Entity.match(/\w{6}_(\w{2})/))
                    if(matching){
                        if(matching[1] in group){
                            group[matching[1]].push(row)
                        }else{
                            group[matching[1]] = [row]
                        }
                    }

                    return group
                }, {})
                
                Object.entries(layers).forEach(([layer , data]) => {
                    let properLayer = layerDefinition[layer]

                    let objectModifiedData = data.map(row => {
                        if(_chartlist[i].grouplevel === 'site'){
                            row['object'] = row['object'].split("-")[0]
                        }
                        return row
                    })

                    let datatable = pivot(objectModifiedData , 'date', 'object', _chartlist[i].name , [] , (format) => {
                        return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
                    })

                    let id = Math.random().toString('26').slice(2)
                    let chartProp = chart(datatable , _chartlist[i].title, 'line' , {
                        chartid: id,
                        excelLineWidth: 2.25,
                        primaryAxisFormat:_chartlist[i].formatting ,
                        primaryAxisEvent: {
                            dblclick: function(e) {
                                let min = this.axis.min 
                                let max = this.axis.max 
                                setChart4GConfig({
                                    show: true , 
                                    min: min , 
                                    max: max , 
                                    chartId: id , 
                                    save: (chartId , minValue , maxValue , chartlist) => {
                                        
                                        let _chartList = {...chartlist}
                                        console.log(_chartList)
                                        let _chart = Object.values(_chartList).flatMap(chart => chart).find(chart => chart.id === chartId)
                                        
                                        if(_chart){
                                            console.log(`Saving chart [${chartId}] from`)
                                            console.log(_chartList)
                                            _chart.yAxis[0]['min'] = minValue
                                            _chart.yAxis[0]['max'] = maxValue
                                            set4GChartProps(_chartList)
                                        }
                                    }
                                })
                            }
                        }
                    })

                    if(properLayer in _chartProps){
                        _chartProps[properLayer].push(chartProp)
                    }else{
                        _chartProps[properLayer] = [chartProp]
                    }
                    
                })
                
            }
        }

        return _chartProps
        //set2GChartProps(_chartProps)
    }

    const queryBlendedChart = async (_chartlist) => {
        let _chartProps = []
        console.log(_chartlist.queryCommand)
        let query = await db.query(_chartlist.queryCommand)
        //console.log(`SELECT ${appContext.objectDate.date} as date , ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel}  as object , ${_chartlist[i].formula} as ${_chartlist[i].name} FROM ${_chartlist[i].tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel} `)
        //console.log(query)
        
        if(query.status === 'Ok'){
            //console.log(query.result)
            
            let key = "date"
            let cat = _chartlist.series.map(series => series.title)

            let datatable = pivot(query.result , "date", cat, null , [], (format) => {
                return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
            })

            let id = Math.random().toString('26').slice(2)
            let chartProp = chart(datatable , 'Blended 2G+3G Voice Traffic (Erl) ', 'line' , {
                chartid: id,
                excelLineWidth: 2.25,
                primaryAxisEvent: {
                    dblclick: function(e) {
                        let min = this.axis.min 
                        let max = this.axis.max 
                        setChartBlendedConfig({
                            show: true , 
                            min: min , 
                            max: max , 
                            chartId: id , 
                            save: (chartId , minValue , maxValue , chartlist) => {
                                let _chartList = chartlist.slice()
                                let _chart = _chartList.find(chart => chart.id === chartId)
                                //console.log(_chartList)
                                if(_chart){
                                    console.log(`Saving chart [${chartId}] from`)
                                    console.log(_chartList)
                                    _chart.yAxis[0]['min'] = minValue
                                    _chart.yAxis[0]['max'] = maxValue
                                    setBlendedChartProps(_chartList)
                                }
                            }
                        })
                    }
                }
            })
            console.log(chartProp)
            _chartProps.push(chartProp)
        }

        return _chartProps
        //set2GChartProps(_chartProps)
    }

    const queryBlendedDataChart = async (_chartlist) => {
        let _chartProps = []
        console.log(_chartlist.queryCommand)
        let query = await db.query(_chartlist.queryCommand)
        //console.log(`SELECT ${appContext.objectDate.date} as date , ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel}  as object , ${_chartlist[i].formula} as ${_chartlist[i].name} FROM ${_chartlist[i].tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${_chartlist[i].grouplevel === 'site' ? appContext.sitelevel : _chartlist[i].grouplevel === 'sector' ? appContext.sectorlevel : appContext.celllevel} `)
        //console.log(query)
        
        if(query.status === 'Ok'){
            //console.log(query.result)
            
            let key = "date"
            let cat = _chartlist.series.map(series => series.title)

            let datatable = pivot(query.result , "date", cat, null , [], (format) => {
                return moment(format, 'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD")
            })

            let id = Math.random().toString('26').slice(2)
            let chartProp = chart(datatable , 'Total DL Data Traffic (GB) ', 'line' , {
                chartid: id,
                excelLineWidth: 2.25,
                primaryAxisEvent: {
                    dblclick: function(e) {
                        let min = this.axis.min 
                        let max = this.axis.max 
                        setChartBlendedConfig({
                            show: true , 
                            min: min , 
                            max: max , 
                            chartId: id , 
                            save: (chartId , minValue , maxValue , chartlist) => {
                                let _chartList = chartlist.slice()
                                let _chart = _chartList.find(chart => chart.id === chartId)
                                //console.log(_chartList)
                                if(_chart){
                                    console.log(`Saving chart [${chartId}] from`)
                                    console.log(_chartList)
                                    _chart.yAxis[0]['min'] = minValue
                                    _chart.yAxis[0]['max'] = maxValue
                                    setBlendedChartProps(_chartList)
                                }
                            }
                        })
                    }
                }
            })
            console.log(chartProp)
            _chartProps.push(chartProp)
        }

        return _chartProps
    }
    React.useEffect(()=>{
        load2GChartConfig()
            .then(() => load3GChartConfig())
            .then(() => load4GChartConfig())
            .then(() => loadBlendedChartConfig())
            .then(() => loadBlendedDataChartConfig())
    },[])

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
                let chart2G = await query2GChart(chart2GList)
                set2GChartProps(chart2G)
                let chart3G = await query3GChart(chart3GList)
                set3GChartProps(chart3G)
                let chart4G = await queryLayerChart(chart4GList)
                set4GChartProps(chart4G)
                let _chartBlendedList = await loadBlendedChartConfig()
                let chartBlended = await queryBlendedChart(_chartBlendedList)
                setBlendedChartProps(chartBlended)
                let _chartBlendedDataList = await loadBlendedDataChartConfig()
                let chartBlendedData = await queryBlendedDataChart(_chartBlendedDataList)
                setBlendedDataChartProps(chartBlendedData)
                freezeContext.setFreeze(false)
            }}>Query</Button></div>
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
                        <Menu.Item name="chart-2g-setting" onClick={()=>{
                            setChart2GSetting(true)
                            setShowMore(false)
                        }}>2G Chart setting</Menu.Item>
                        <Menu.Item name="chart-3g-setting" onClick={()=>{
                            setChart3GSetting(true)
                            setShowMore(false)
                        }}>3G Chart setting</Menu.Item>
                        <Menu.Item name="chart-4g-setting" onClick={()=>{
                            setChart4GSetting(true)
                            setShowMore(false)
                        }}>4G Chart setting</Menu.Item>
                        <Menu.Item name="chart-blended-setting" onClick={()=>{
                            setChartBlendedSetting(true)
                            setShowMore(false)
                        }}>Blended Voice Chart setting</Menu.Item>
                        <Menu.Item name="chart-blended-setting" onClick={()=>{
                            setChartBlendedDataSetting(true)
                            setShowMore(false)
                        }}>Blended Data Chart setting</Menu.Item>
                        <Menu.Item name="export-report" onClick={()=>{
                            console.log("Export report")
                            freezeContext.setFreeze(true, 'Exporting...')
                            let operations = [
                                {operation: 'chart', highchart: chart2GProps , width: 823 , height:272 , x: 0, column: 1},
                                {operation: 'chart', highchart: chart3GProps , width: 823 , height:272 , x: 830, column: 1}
                            ]
                            Object.entries(chart4GProps).forEach(([layer, chartProps],layerIndex) => {
                                operations.push({
                                    operation: 'chart', highchart: chartProps , width: 823 , height:272 , x: 1660 + layerIndex*830, column: 1
                                })
                            })
                            operations.push({
                                operation: 'chart', highchart: chartBlendedProps , width: 823 , height:272 , x: 1660 + Object.keys(chart4GProps).length * 830, column: 1
                            })
                            db.excelService(operations).finally(()=>{
                                freezeContext.setFreeze(false)
                            })
                            setShowMore(false)
                        }}>Export report</Menu.Item>
                    </Menu>
                    
                )}
            </Overlay>
        </div>
        <div style={{display:'flex',height:'calc( 100vh - 97px - 74px )',overflowY:'auto'}}>
            <div style={{flexGrow:1,flexShrink:0,flexBasis:'33%'}}>
                <div style={{backgroundColor:'#75c55b', color:'white', padding: '5px 0px', margin:'0px 20px', textAlign:'center'}}>2G KPI</div>
                {chart2GProps.length > 0 && chart2GProps.map((_chartProp, _chartInd)=>{
                    return <HighchartsReact key={_chartInd} highcharts={Highcharts} options={_chartProp} containerProps={{style:{height:'300px'}}}/>
                })}
            </div>
            <div style={{flexGrow:1,flexShrink:0,flexBasis:'33%'}}>
                <div style={{backgroundColor:'#75c55b', color:'white', padding: '5px 0px', margin:'0px 20px', textAlign:'center'}}>3G KPI</div>
                {chart3GProps.length > 0 && chart3GProps.map((_chartProp, _chartInd)=>{
                    return <HighchartsReact key={_chartInd} highcharts={Highcharts} options={_chartProp} containerProps={{style:{height:'300px'}}}/>
                })}
            </div>
                
            {Object.entries(chart4GProps).map(([layer , _chartPropList ], layerIndex) => {
                return (<div style={{flexGrow:1,flexShrink:0,flexBasis:'33%'}} key={layerIndex}>
                    <div style={{backgroundColor:'#75c55b', color:'white', padding: '5px 0px', margin:'0px 20px', textAlign:'center'}}>{`4G KPI [${layer}]`}</div>
                    {_chartPropList.map((_chartProp, _chartInd)=>{
                        return <HighchartsReact key={_chartInd} highcharts={Highcharts} options={_chartProp} containerProps={{style:{height:'300px'}}}/>
                    })}
                </div>)
            })}
                {/*chart4GProps.length > 0 && chart4GProps.map((_chartProp, _chartInd)=>{
                    return <HighchartsReact key={_chartInd} highcharts={Highcharts} options={_chartProp} containerProps={{style:{height:'300px'}}}/>
                })*/}
            
            <div style={{flexGrow:1,flexShrink:0,flexBasis:'33%'}}>
                <div style={{backgroundColor:'#75c55b', color:'white', padding: '5px 0px', margin:'0px 20px', textAlign:'center'}}>Blended Voice Traffic</div>
                {chartBlendedProps.length > 0 && chartBlendedProps.map((_chartProp, _chartInd)=>{
                    return <HighchartsReact key={_chartInd} highcharts={Highcharts} options={_chartProp} containerProps={{style:{height:'300px'}}}/>
                })}
                <div style={{backgroundColor:'#75c55b', color:'white', padding: '5px 0px', margin:'0px 20px', textAlign:'center'}}>Blended Data Traffic</div>
                {chartBlendedDataProps.length > 0 && chartBlendedDataProps.map((_chartProp, _chartInd)=>{
                    return <HighchartsReact key={_chartInd} highcharts={Highcharts} options={_chartProp} containerProps={{style:{height:'300px'}}}/>
                })}
            </div>
        </div>
        <SettingModal 
            show={chart2GSetting} 
            table={'antennaswap2g'}
            tableQuery={'SELECT antennaswap2g.ID , antennaswap2g.title  , antennaswap2g.grouplevel , antennaswap2g.formatting , antennaswap2g.formulaid , formulas.name , formulas.tablename  FROM antennaswap2g LEFT JOIN formulas ON antennaswap2g.formulaid = formulas.ID'}
            inserNewQuery={`INSERT INTO antennaswap2g ( title , grouplevel , formatting ) VALUES ( 'New chart title'  , 'site' , 'general' )`}
            additionQuery={{formulas:"SELECT ID , name , tablename from formulas where tablename = 'RAW2G'"}}
            tableColumns={[{
                header:'Chart Title',
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
                header:'Group Level',
                field: 'grouplevel',
                edit: true,
                editType: 'text', 
            } ,{
                header: 'Format', 
                field: 'formatting', 
                edit: true, 
                editType: 'text'
            }]}
            onHide={()=>setChart2GSetting(false)} 
            refreshing={()=>{
                console.log('reapply to chart')
                load2GChartConfig().then((_chartlist)=>{
                    return query2GChart(_chartlist)
                }).then((chart2G) => set2GChartProps(chart2G))
            }}
        />
        <SettingModal 
            show={chart3GSetting} 
            table={'antennaswap3g'}
            tableQuery={'SELECT antennaswap3g.ID , antennaswap3g.title , antennaswap3g.grouplevel  , antennaswap3g.formulaid , antennaswap3g.formatting , formulas.name , formulas.tablename  FROM antennaswap3g LEFT JOIN formulas ON antennaswap3g.formulaid = formulas.ID'}
            inserNewQuery={`INSERT INTO antennaswap3g ( title , grouplevel , formatting ) VALUES ( 'New chart title' , 'site' , 'general' )`}
            additionQuery={{formulas:"SELECT ID , name , tablename from formulas where tablename = 'RAW3G'"}}
            tableColumns={[{
                header:'Chart Title',
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
                header:'Group Level',
                field: 'grouplevel',
                edit: true,
                editType: 'text', 
            } ,{
                header: 'Format', 
                field: 'formatting', 
                edit: true, 
                editType: 'text'
            }]}
            onHide={()=>setChart3GSetting(false)} 
            refreshing={()=>{
                console.log('reapply to chart')
                load3GChartConfig().then((_chartlist)=>{
                    return query3GChart(_chartlist)
                }).then((chart3g) => set3GChartProps(chart3g))
            }}
        />
        <SettingModal 
            show={chart4GSetting} 
            table={'antennaswap4g'}
            tableQuery={'SELECT antennaswap4g.ID , antennaswap4g.title  , antennaswap4g.formulaid , antennaswap4g.formatting , formulas.name , formulas.tablename , antennaswap4g.grouplevel FROM antennaswap4g LEFT JOIN formulas ON antennaswap4g.formulaid = formulas.ID'}
            inserNewQuery={`INSERT INTO antennaswap4g ( title , grouplevel , formatting) VALUES ( 'New chart title' , 'site' , 'general')`}
            additionQuery={{formulas:"SELECT ID , name , tablename from formulas where tablename = 'RAW4G'"}}
            tableColumns={[{
                header:'Chart Title',
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
            },{
                header: 'Group Level', 
                field: 'grouplevel', 
                edit: true, 
                editType: 'text'
            },{
                header: 'Format', 
                field: 'formatting', 
                edit: true, 
                editType: 'text'
            }]}
            onHide={()=>setChart4GSetting(false)} 
            refreshing={()=>{
                console.log('reapply to chart')
                load4GChartConfig().then((_chartlist)=>{
                    return queryLayerChart(_chartlist)
                }).then((chart4g) => set4GChartProps(chart4g))
            }}
        />
        <SettingModal 
            show={chartBlendedSetting} 
            table={'antennaswapblended'}
            tableQuery={'SELECT antennaswapblended.ID , antennaswapblended.title  , antennaswapblended.formulaid , formulas.name , formulas.tablename FROM antennaswapblended LEFT JOIN formulas ON antennaswapblended.formulaid = formulas.ID'}
            inserNewQuery={`INSERT INTO antennaswapblended ( title  ) VALUES ( 'New series title'  )`}
            additionQuery={{formulas:"SELECT ID , name , tablename from formulas"}}
            tableColumns={[{
                header:'Series Title',
                field: 'title',
                edit: true,
                editType: 'text', 
            } , {
                header: 'KPI',
                field: 'name',
                edit: true, 
                editType: 'selection',
                editSelection: 'formulas', 
                key: 'ID', // Key for selection option
                value: 'formulaid', // map key in selection option to base query column
                text: 'name',// display text in selection option, 
            }]}
            onHide={()=>setChartBlendedSetting(false)} 
            refreshing={()=>{
                console.log('reapply to chart')
                loadBlendedChartConfig().then((_chartlist)=>{
                    return queryBlendedChart(_chartlist)
                }).then((chartBlended) => setBlendedChartProps(chartBlended))
            }}
        />
        <SettingModal 
            show={chartBlendedDataSetting} 
            table={'antennaswapblendeddata'}
            tableQuery={'SELECT antennaswapblendeddata.ID , antennaswapblendeddata.title  , antennaswapblendeddata.formulaid , formulas.name , formulas.tablename FROM antennaswapblendeddata LEFT JOIN formulas ON antennaswapblendeddata.formulaid = formulas.ID'}
            inserNewQuery={`INSERT INTO antennaswapblendeddata ( title  ) VALUES ( 'New series title'  )`}
            additionQuery={{formulas:"SELECT ID , name , tablename from formulas"}}
            tableColumns={[{
                header:'Series Title',
                field: 'title',
                edit: true,
                editType: 'text', 
            } , {
                header: 'KPI',
                field: 'name',
                edit: true, 
                editType: 'selection',
                editSelection: 'formulas', 
                key: 'ID', // Key for selection option
                value: 'formulaid', // map key in selection option to base query column
                text: 'name',// display text in selection option, 
            }]}
            onHide={()=>setChartBlendedDataSetting(false)} 
            refreshing={()=>{
                console.log('reapply to chart')
                loadBlendedDataChartConfig().then((_chartlist)=>{
                    return queryBlendedDataChart(_chartlist)
                }).then((chartBlended) => setBlendedDataChartProps(chartBlended))
            }}
        />

        <ChartConfigModal show={chart2GConfig.show} onHide={()=>{
            setChart2GConfig({show: false , min:null , max: null , chartId: null, save: null })
        }} min={chart2GConfig.min} max={chart2GConfig.max} chartId={chart2GConfig.chartId} save={chart2GConfig.save} chartlist={chart2GProps} />
        <ChartConfigModal show={chart3GConfig.show} onHide={()=>{
            setChart3GConfig({show: false , min:null , max: null , chartId: null, save: null })
        }} min={chart3GConfig.min} max={chart3GConfig.max} chartId={chart3GConfig.chartId} save={chart3GConfig.save} chartlist={chart3GProps} />
        <ChartConfigModal show={chart4GConfig.show} onHide={()=>{
            setChart4GConfig({show: false , min:null , max: null , chartId: null, save: null })
        }} min={chart4GConfig.min} max={chart4GConfig.max} chartId={chart4GConfig.chartId} save={chart4GConfig.save} chartlist={chart4GProps} />
        <ChartConfigModal show={chartBlendedConfig.show} onHide={()=>{
            setChartBlendedConfig({show: false , min:null , max: null , chartId: null, save: null })
        }} min={chartBlendedConfig.min} max={chartBlendedConfig.max} chartId={chartBlendedConfig.chartId} save={chartBlendedConfig.save} chartlist={chartBlendedProps} />
    </div>
}

export default KPIChart