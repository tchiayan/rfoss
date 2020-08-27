import React from 'react';
import "./AntennaSwapReport.css";

import { Form , Button , Tab, Table, TableHeaderCell, Icon, Menu} from 'semantic-ui-react';
import { Overlay } from 'react-bootstrap';
import { chart , ChartConfigModal } from '../../module/Function';
import SettingModal from '../../module/SettingModal';
import * as moment from 'moment';
import { Parser } from 'expr-eval';
import { Database } from '../../Database';
import AppContext from '../../module/AppContext';
import FreezeContext from '../../module/FreezeView';


import Highcharts from "highcharts";
import HighchartsReact from 'highcharts-react-official';
import HighchartsExporting from 'highcharts/modules/exporting';

HighchartsExporting(Highcharts)


const pivot = (data, key, category, val, filter = [], keyFormat = null) => {
    // filter data 
    if(filter.length > 0){
        if(typeof category === 'string'){
            data = data.filter(row => filter.includes(row[category]))
        }else{
            data = data.filter(row => filter.includes(row['object']))
        }
    }

    // checking val array must follow by array category [Each val corresponding to each of category for title purpose]
    if(Array.isArray(val)){
      if(!Array.isArray(category)){
        throw Error("Category must be an array of column title")
      }
    }

    
    const _key = typeof key === 'string' ? Array.from(new Set(data.map(row => row[key]))) : key
    const _cat = typeof category !== 'string' ? category: !Array.isArray(val) ? Array.from(new Set(data.map(row => row[category]))) : [...category]
    
    let variable = Array.isArray(val) ? val.map(formula => Array.from(formula.matchAll(/(?<agg>\w+)\((?<counter>\w+)\)/g)).map(matched => matched.groups.counter)
        ).flatMap(val => val) : Array.from(val.matchAll(/(?<agg>\w+)\((?<counter>\w+)\)/g)).map(matched => matched.groups.counter)

    variable = Array.from(new Set(variable))
    //console.log(Array.from(new Set(variable)))
    data = data.reduce((newdata, row) => {
      let existing = typeof category !== 'string' ? newdata.find(_row => _row[key] === row[key]) : newdata.find(_row => _row[key] === row[key] && _row[category] == row[category])
      if(existing){
        existing['count']++;
        variable.forEach(field => {
          existing[field] += row[field]
        })
      }else{
        let newEntry = {[key]:row[key], count: 1}
        if(typeof category === 'string'){
          newEntry[category] = row[category]
        }
        variable.forEach(field => {
          newEntry[field] = row[field]
        })
        newdata.push(newEntry)
      }
      return newdata
    },[])

    // performed agg average
    let variableAvg = Array.from(new Set(Array.isArray(val) ? val.map(formula => Array.from(formula.matchAll(/avg\((?<counter>\w+)\)/g)).map(matched => matched.groups.counter)
    ).flatMap(val => val) : Array.from(val.matchAll(/avg\((?<counter>\w+)\)/g)).map(matched => matched.groups.counter)))
    if(variableAvg.length > 0){
        data.forEach(row => {
            variableAvg.forEach(field => {
                row[field] = row[field] / row.count
            })
        })
    }
    
    // Dimension  = _key + 1 x _cat [ row  * column]
    let table = (new Array(_key.length+1))
    for(let i=0; i < table.length; i++){
      if(i === 0){
        table[i] = [typeof key !== 'string' ? 'key' : key, ..._cat ]
      }else{
        table[i] = (new Array(_cat.length + 1)).fill(null)
        table[i][0] = keyFormat !== null ? keyFormat(_key[i-1]) : _key[i-1]
      }
    }

    // Allocate Value 
    for(let i=0; i < data.length ; i ++){
        const rowIndex = _key.indexOf(data[i][typeof key !== 'string' ? 'key' : key])
        
        if(Array.isArray(val)){
          val.forEach((formula, ind) => {
            table[rowIndex+1][ind+1] = Parser.evaluate(formula.replace(/(?<agg>\w+)\((?<counter>\w+)\)/g,"$<counter>") , data[i])
          })
        }else if(typeof category === 'string'){
          const columnIndex = _cat.indexOf(data[i][category])
          if(rowIndex !== -1 && columnIndex !== -1){
              table[rowIndex+1][columnIndex+1] = table[rowIndex+1][columnIndex+1] !==null ? table[rowIndex+1][columnIndex+1] + Parser.evaluate(val.replace(/(?<agg>\w+)\((?<counter>\w+)\)/g,"$<counter>") , data[i]) : Parser.evaluate(val.replace(/(?<agg>\w+)\((?<counter>\w+)\)/g,"$<counter>") , data[i])
          }
        }else{
          for(let j=0 ; j < _cat.length ;  j++){
              table[rowIndex+1][j+1] = table[rowIndex+1][j+1] !== null ? table[rowIndex+1][j+1]+data[i][_cat[j]] : data[i][_cat[j]]
          }
        }
    }
    
    return table
}

function AntennaSwapReport(){
    let db = new Database()

    // App context
    const appContext = React.useContext(AppContext)
    // Freeze context
    const freezeContext = React.useContext(FreezeContext)

    // State
    const [ startDate , setStartDate ] = React.useState(moment(new Date()).startOf('days').subtract(28,'days').format("YYYY-MM-DD")) //React.useState(moment(new Date()).startOf('days').subtract(15, 'days').format('YYYY-MM-DD'))
    const [ endDate , setEndDate ] = React.useState(moment(new Date()).startOf('days').subtract(1, 'days').format('YYYY-MM-DD'))
    const [ sites , setSites ] = React.useState(localStorage.getItem("historySites") !== null ? localStorage.getItem("historySites") : "1011A")
    const [ config2g , setConfig2G ] = React.useState([])
    const [ config3g , setConfig3G ] = React.useState([]) 
    const [ config4g , setConfig4G ] = React.useState([])
    const [ configBlended , setConfigBlended ] = React.useState(null)
    const [ charts2g , setCharts2g ] = React.useState([])
    const [ charts3g , setCharts3g ] = React.useState([])
    const [ charts4g , setCharts4g ] = React.useState([])
    const [ chartsBlended , setChartsBlended ] = React.useState([]) 
    const [ kpitable , setkpitable ] = React.useState([])
    const [ showMore , setShowMore ] = React.useState(false)
    const [ chart2GConfig , setChart2GConfig ] = React.useState({show: false, min: null , max: null , chartId: null, save: null})
    const [ chart3GConfig , setChart3GConfig ] = React.useState({show: false, min: null , max: null , chartId: null, save: null})
    const [ chart4GConfig , setChart4GConfig ] = React.useState({show: false, min: null , max: null , chartId: null, save: null})
    const [ chartBlendedConfig , setChartBlendedConfig ] = React.useState({show: false, min: null , max: null , chartId: null, save: null})
    const [ chart2GSetting , setChart2GSetting ] = React.useState(false) // setting modal
    const [ chart3GSetting , setChart3GSetting ] = React.useState(false) // setting modal
    const [ chart4GSetting , setChart4GSetting ] = React.useState(false) // setting modal
    const [ chartBlendedSetting , setChartBlendedSetting ] = React.useState(false) // setting modal
    const [ exportedRaw2G , setExportedRaw2G ] = React.useState([])
    const [ exportedRaw3G , setExportedRaw3G ] = React.useState([])
    const [ exportedRaw4G , setExportedRaw4G ] = React.useState([])

    // Reference
    const moreTarget = React.useRef(null)


    const load2GChartConfig = () => {
        let query = db.query(`SELECT antennaswap2g.ID , antennaswap2g.title  , antennaswap2g.formatting , antennaswap2g.formulaid , formulas.name , formulas.formula , formulas.tablename , antennaswap2g.grouplevel FROM antennaswap2g LEFT JOIN formulas ON antennaswap2g.formulaid = formulas.ID`)
        return query.then((response)=>{
            if(response.status === 'Ok'){
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
        return query.then((response)=>{
            if(response.status === 'Ok'){
                return response.result
            }else{
                throw Error("Unable to load chart configuration")
            }
        }).catch((err)=>{
            console.log(err)
        })
    }

    React.useEffect(()=>{
        load2GChartConfig().then((config) => {
            setConfig2G(config)
            return load3GChartConfig()
        }).then((config) => {
            setConfig3G(config)
            return load4GChartConfig()
        }).then((config) => {
            setConfig4G(config)
            return loadBlendedChartConfig()
        }).then(async (config) => {
            let blendedSetting = config
            let rawcounter = []
            blendedSetting.forEach(setting  => {
                let regex = RegExp(`(${['sum','avg'].join("|")})\\((?<counter>\\w+)\\)`, 'g')
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

            setConfigBlended({
                rawcounter: rawcounter, 
                series: config
            })
        })
    },[])

    const queryAction = async () => {
        let _kpiTable = []
        freezeContext.setFreeze(true , "Querying... ")
        let counters2g = Array.from(new Set(config2g.flatMap(config => Array.from(config.formula.matchAll(/(sum|avg)\((?<counter>\w+)\)/g)).map(match => match.groups.counter))))
        if(appContext.projectConfig){
            if(appContext.projectConfig.antennaswap){
                if(appContext.projectConfig.antennaswap.export){
                    if(appContext.projectConfig.antennaswap.export.RAW2G){
                        counters2g.push(...appContext.projectConfig.antennaswap.export.RAW2G.filter(entry => entry.from === 'database' && entry.type !== 'date').filter(entry => entry.field !== 'cell').map(entry => entry.field))
                        counters2g = Array.from(new Set(counters2g))

                    }
                }
            }
        }
        let query2g = await db.query(`SELECT ${appContext.objectDate.date} as date , ${appContext.celllevel} as cell, ${counters2g.join(" , ")} FROM RAW2G WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} )`)
    
        freezeContext.setFreeze(true , "Querying 2G KPI ...")
        if(query2g.status === 'Ok'){
            let rawdata2g = query2g.result.map(row => {
                // split to site 
                row['site'] = row['cell'].match(/\d{4}\w/)[0]
                row['date'] = moment(row['date']).format("YYYY-MM-DD")
                row['sector'] = row['cell'].replace(/(?<site>\d{4}\w)_?\d?-\w{2}\d(?<sector>[\d|\w])/, '$<site> S$<sector>')
                row['cell'] = row['cell'].replace(/(?<site>\d{4}[A-Z|a-z])_?\d?-(?<layer>[A-Z|a-z]{2})(?<sector>\d)_?\d?/ , '$<site>-$<layer>$<sector>')
                return row
            })

            //setData2g(rawdata2g)
            
            let _charts2g = config2g.map((config, index) => {
                let datatable = pivot(rawdata2g.slice(), 'date', config.grouplevel , config.formula)
                let id = Math.random().toString('26').slice(2)
                let chart2g = chart(datatable , config.title , 'line' , {
                    chartid: id,
                    excelLineWidth: 2.25,
                    primaryAxisFormat:config.formatting, 
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
                                    //console.log(_chartList)
                                    if(_chart){
                                        //console.log(`Saving chart [${chartId}] from`)
                                        //console.log(_chartList)
                                        _chart.yAxis[0]['min'] = minValue
                                        _chart.yAxis[0]['max'] = maxValue
                                        setCharts2g(_chartList)
                                    }
                                }
                            })
                        }
                    }
                })

                chart2g['exporting'] = {
                    menuItemDefinitions: {
                        groupBySite:{
                            onclick: () => {
                                setCharts2g((previousCharts2G) => {
                                    let _datatable = pivot(rawdata2g.slice() , 'date', 'site', config.formula)
                                    let _previousCharts2G = previousCharts2G.slice()
                                    Object.assign(_previousCharts2G[index] , chart(_datatable , config.title , 'line', {
                                        excelLineWidth: 2.25
                                    }))

                                    return _previousCharts2G
                                })
                            }, 
                            text: 'Group by site'
                        },
                        groupByCell:{
                            onclick: () => {
                                
                                console.log(rawdata2g.slice())
                                setCharts2g((previousCharts2G) => {
                                    let _datatable = pivot(rawdata2g.slice() , 'date', 'cell', config.formula)
                                    let _previousCharts2G = previousCharts2G.slice()
                                    Object.assign(_previousCharts2G[index] , chart(_datatable , config.title , 'line', {
                                        excelLineWidth: 2.25
                                    }))

                                    return _previousCharts2G
                                })
                            }, 
                            text: 'Group by cell'
                        }
                    }, 
                    buttons: {
                        contextButton: {
                            menuItems: ['groupBySite', 'groupByCell']
                        }
                    }
                }
                return chart2g
            })

            _kpiTable.push(
                {   
                    name: 'GSM KPI',
                    table:pivot(rawdata2g.slice(), 'sector', config2g.map(config => config.title) ,  config2g.map(config => config.formatting === 'percentage' ? `100*(${config.formula})`:config.formula))
                }
            )
            setCharts2g(_charts2g)

            if(appContext.projectConfig){
                if(appContext.projectConfig.antennaswap){
                    if(appContext.projectConfig.antennaswap.export){
                        if(appContext.projectConfig.antennaswap.export.RAW2G){
                            let exportTable = [appContext.projectConfig.antennaswap.export.RAW2G.map(exported => exported.name)]
                            rawdata2g.slice().forEach(row => {
                                let exportrow = appContext.projectConfig.antennaswap.export.RAW2G.map(exported => {
                                    if(exported.type === 'string'){
                                        if(exported.from === 'fixed'){
                                            return exported.value
                                        }else{
                                            if('postfix' in exported){
                                                return row[exported.field].toString() + exported.postfix
                                            }else{
                                                return row[exported.field]
                                            }
                                        }
                                    }else if(exported.type === 'date'){
                                        if(exported.add !== undefined){
                                            return moment(row[exported.field]).clone().add(exported.add.period , exported.add.granularity).format(exported.format)
                                        }else{
                                            return moment(row[exported.field]).format(exported.format)
                                        }
                                    }
                                })
                                exportTable.push(exportrow)
                            })
                            setExportedRaw2G(exportTable)
                        }
                    }
                }
            }
        }

        freezeContext.setFreeze(true , "Querying 3G KPI ...")
        let counters3g = Array.from(new Set(config3g.flatMap(config => Array.from(config.formula.matchAll(/(sum|avg)\((?<counter>\w+)\)/g)).map(match => match.groups.counter))))
        if(appContext.projectConfig){
            if(appContext.projectConfig.antennaswap){
                if(appContext.projectConfig.antennaswap.export){
                    if(appContext.projectConfig.antennaswap.export.RAW3G){
                        counters3g.push(...appContext.projectConfig.antennaswap.export.RAW3G.filter(entry => entry.from === 'database' && entry.type !== 'date').filter(entry => entry.field !== 'cell').map(entry => entry.field))
                        counters3g = Array.from(new Set(counters3g))
                    }
                }
            }
        }

        let query3g = await db.query(`SELECT ${appContext.objectDate.date} as date , ${appContext.celllevel} as cell, ${counters3g.join(" , ")} FROM RAW3G WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} )`)

        if(query3g.status === 'Ok'){
            let rawdata3g = query3g.result.map(row => {
                // split to site 
                row['site'] = row['cell'].match(/\d{4}\w/)[0]
                row['sector'] = row['cell'].replace(/(?<site>\d{4}\w)_?\d?-\w{2}\d(?<sector>[\d|\w])/, '$<site> S$<sector>')
                row['date'] = moment(row['date']).format("YYYY-MM-DD")
                return row
            })

            //setData3g(rawdata3g)

            let _charts3g = config3g.map((config, index) => {
                let datatable = pivot(rawdata3g.slice(), 'date', config.grouplevel , config.formula)
                let id = Math.random().toString('26').slice(2)
                let charts3g = chart(datatable , config.title , 'line' , {
                    chartid: id,
                    excelLineWidth: 2.25, 
                    primaryAxisFormat:config.formatting, 
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
                                    //console.log(_chartList)
                                    if(_chart){
                                        //console.log(`Saving chart [${chartId}] from`)
                                        //console.log(_chartList)
                                        _chart.yAxis[0]['min'] = minValue
                                        _chart.yAxis[0]['max'] = maxValue
                                        setCharts3g(_chartList)
                                    }
                                }
                            })
                        }
                    }
                })

                charts3g['exporting'] = {
                    menuItemDefinitions: {
                        groupBySite:{
                            onclick: () => {
                                setCharts3g((previousCharts3G) => {
                                    let _datatable = pivot(rawdata3g.slice() , 'date', 'site', config.formula)
                                    let _previousCharts3G = previousCharts3G.slice()
                                    Object.assign(_previousCharts3G[index] , chart(_datatable , config.title , 'line', {
                                        excelLineWidth: 2.25
                                    }))

                                    return _previousCharts3G
                                })
                            }, 
                            text: 'Group by site'
                        },
                        groupByCell:{
                            onclick: () => {
                                console.log(rawdata3g.slice())
                                setCharts3g((previousCharts3G) => {
                                    let _datatable = pivot(rawdata3g.slice() , 'date', 'cell', config.formula)
                                    let _previousCharts3G = previousCharts3G.slice()
                                    Object.assign(_previousCharts3G[index] , chart(_datatable , config.title , 'line', {
                                        excelLineWidth: 2.25
                                    }))

                                    return _previousCharts3G
                                })
                            }, 
                            text: 'Group by cell'
                        },
                        groupBySector:{
                            onclick: () => {
                                console.log(rawdata3g.slice())
                                setCharts3g((previousCharts3G) => {
                                    let _datatable = pivot(rawdata3g.slice() , 'date', 'sector', config.formula)
                                    let _previousCharts3G = previousCharts3G.slice()
                                    Object.assign(_previousCharts3G[index] , chart(_datatable , config.title , 'line', {
                                        excelLineWidth: 2.25
                                    }))

                                    return _previousCharts3G
                                })
                            }, 
                            text: 'Group by sector'
                        }
                    }, 
                    buttons: {
                        contextButton: {
                            menuItems: ['groupBySite', 'groupByCell', 'groupBySector']
                        }
                    }
                }
                return charts3g
            })

            _kpiTable.push(
                {   
                    name: 'UMTS KPI',
                    table:pivot(rawdata3g.slice(), 'sector', config3g.map(config => config.title) ,  config3g.map(config => config.formatting === 'percentage' ? `100*(${config.formula})`:config.formula))
                }
            )
            setCharts3g(_charts3g)

            if(appContext.projectConfig){
                if(appContext.projectConfig.antennaswap){
                    if(appContext.projectConfig.antennaswap.export){
                        if(appContext.projectConfig.antennaswap.export.RAW3G){
                            let exportTable = [appContext.projectConfig.antennaswap.export.RAW3G.map(exported => exported.name)]
                            rawdata3g.slice().forEach(row => {
                                let exportrow = appContext.projectConfig.antennaswap.export.RAW3G.map(exported => {
                                    if(exported.type === 'string'){
                                        if(exported.from === 'fixed'){
                                            return exported.value
                                        }else{
                                            if('postfix' in exported){
                                                return row[exported.field].toString() + exported.postfix
                                            }else{
                                                return row[exported.field]
                                            }
                                        }
                                    }else if(exported.type === 'date'){
                                        if("add" in exported){
                                            return moment(row[exported.field]).clone().add(exported.add.period , exported.add.granularity).format(exported.format)
                                        }else{
                                            return moment(row[exported.field]).format(exported.format)
                                        }
                                    }
                                })
                                exportTable.push(exportrow)
                            })
                            setExportedRaw3G(exportTable)
                        }
                    }
                }
            }
        }

        freezeContext.setFreeze(true , "Querying 4G KPI ...")
        let counters4g = Array.from(new Set(config4g.flatMap(config => Array.from(config.formula.matchAll(/(sum|avg)\((?<counter>\w+)\)/g)).map(match => match.groups.counter))))
        if(appContext.projectConfig){
            if(appContext.projectConfig.antennaswap){
                if(appContext.projectConfig.antennaswap.export){
                    if(appContext.projectConfig.antennaswap.export.RAW4G){
                        counters4g.push(...appContext.projectConfig.antennaswap.export.RAW4G.filter(entry => entry.from === 'database' && entry.type !== 'date').filter(entry => entry.field !== 'cell').map(entry => entry.field))
                        counters4g = Array.from(new Set(counters4g))
                    }
                }
            }
        }
        console.log(counters4g)
        let query4g = await db.query(`SELECT ${appContext.objectDate.date} as date , ${appContext.celllevel} as cell, ${counters4g.join(" , ")} FROM RAW4G WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} )`)
        console.log(`SELECT ${appContext.objectDate.date} as date , ${appContext.celllevel} as cell, ${counters4g.join(" , ")} FROM RAW4G WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} )`)
        if(query4g.status === 'Ok'){
            console.log(query4g.result.slice())
            let rawdata4g = query4g.result.map(row => {
                // split to site 
                //console.log(row['object'])
                //row['_object'] = row['object']
                row['site'] = row['cell'].match(/\d{4}\w/)[0]
                row['sector'] = row['cell'].replace(/(?<site>\d{4}\w)_?\d?-\w{2}\d(?<sector>[\d|\w])/, '$<site> S$<sector>')
                row['date'] = moment(row['date']).format("YYYY-MM-DD")
                
                counters4g.forEach(field => {
                    if(typeof row[field] === 'string'){
                        row[field] = parseFloat(row[field].replace(/,/g, ""))
                    }
                })
                
                return row
            })
            console.log(rawdata4g.slice())

            const layerDefinition = {
                1: 'L26',
                2: 'L18',
                5: 'L09',
                7: 'L21'
            }

            let layers = Object.entries(rawdata4g.reduce((group, row) => {
                let matching = row.cell.match(/\d{4}\w\_?\d?-\w{2}(\d)[\d|\w]/)
                //console.log(row.Entity.match(/\w{6}_(\w{2})/))
                if(matching){
                    if(matching[1] in group){
                        group[matching[1]].push(row)
                    }else{
                        group[matching[1]] = [row]
                    }
                }

                return group
            }, {})).map(([layer , data]) => {
                return {
                    layer: layerDefinition[layer], 
                    data: data
                }
            })
            layers.push({
                layer: 'All',
                data: layers.flatMap(eachLayer => eachLayer.data)
            })
            //setData4g(layers)

            let charts4g = layers.map(({layer , data}) => {

                let charts = config4g.map((config, index) => {
                    let id = Math.random().toString('26').slice(2)
                    let datatable = pivot(data.slice(), 'date', config.grouplevel , config.formula)
                    let charts4g = chart(datatable , config.title , 'line' , {
                        chartid: id,
                        excelLineWidth: 2.25, 
                        primaryAxisFormat:config.formatting ,
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
                                        
                                        let _chartList = chartlist.slice()
                                        let _chart = _chartList.flatMap(chart => chart.charts).find(chart => chart.id === chartId)
                                        
                                        if(_chart){
                                            _chart.yAxis[0]['min'] = minValue
                                            _chart.yAxis[0]['max'] = maxValue
                                            setCharts4g(_chartList)
                                        }
                                    }
                                })
                            }
                        }
                    })
                    charts4g['exporting'] = {
                        menuItemDefinitions: {
                            groupBySite:{
                                onclick: () => {
                                    setCharts4g((previousCharts4G) => {
                                        let datatable = pivot(data.slice() , 'date', 'site', config.formula)
                                        let _previousCharts4G = previousCharts4G.slice()
                                        let _chart4gIndex = _previousCharts4G.find((_chart) => _chart.layer === layer)
                                        Object.assign(_chart4gIndex.charts[index] , chart(datatable , config.title , 'line', {
                                            excelLineWidth: 2.25
                                        }))
    
                                        return _previousCharts4G
                                    })
                                }, 
                                text: 'Group by site'
                            },
                            groupByCell:{
                                onclick: () => {
                                    setCharts4g((previousCharts4G) => {
                                        let datatable = pivot(data.slice() , 'date', 'cell', config.formula)
                                        let _previousCharts4G = previousCharts4G.slice()
                                        let _chart4gIndex = _previousCharts4G.find((_chart) => _chart.layer === layer)
                                        Object.assign(_chart4gIndex.charts[index] , chart(datatable , config.title , 'line', {
                                            excelLineWidth: 2.25
                                        }))
    
                                        return _previousCharts4G
                                    })
                                }, 
                                text: 'Group by cell'
                            },
                        },
                        buttons:{
                            contextButton:{
                                menuItems: ['groupBySite','groupByCell']
                            }
                        }
                    }
                    return charts4g
                })
                return {
                    layer: layer,
                    charts: charts

                }
            })

            
            _kpiTable.push(...layers.map(eachlayer => {
                return {
                    name: `LTE ${eachlayer.layer}`, 
                    table:pivot(eachlayer.data.slice(), 'sector', config4g.map(config => config.title) ,  config4g.map(config => config.formatting === 'percentage' ? `100*(${config.formula})`:config.formula))
                }}
            ))

            setCharts4g(charts4g)

            if(appContext.projectConfig){
                if(appContext.projectConfig.antennaswap){
                    if(appContext.projectConfig.antennaswap.export){
                        console.log(appContext.projectConfig.antennaswap.export)
                        if(appContext.projectConfig.antennaswap.export.RAW4G){
                            let exportTable = [appContext.projectConfig.antennaswap.export.RAW4G.map(exported => exported.name)]
                            console.log(rawdata4g)
                            rawdata4g.slice().forEach(row => {
                                let exportrow = appContext.projectConfig.antennaswap.export.RAW4G.map(exported => {
                                    if(exported.type === 'string'){
                                        if(exported.from === 'fixed'){
                                            return exported.value
                                        }else{
                                            if('postfix' in exported){
                                                return row[exported.field].toString() + exported.postfix
                                            }else{
                                                return row[exported.field]
                                            }
                                            
                                        }
                                    }else if(exported.type === 'date'){
                                        if(exported.add !== undefined){
                                            return moment(row[exported.field]).clone().add(exported.add.period , exported.add.granularity).format(exported.format)
                                        }else{
                                            return moment(row[exported.field]).format(exported.format)
                                        }
                                    }
                                })
                                exportTable.push(exportrow)
                            })
                            setExportedRaw4G(exportTable)
                        }
                    }
                }
            }
        }

        freezeContext.setFreeze(true, "Querying blended KPI ...")
        let queryCountersByTable = Object.entries(configBlended.rawcounter.reduce((table , current) => {
            if(!(current.tablename in table)){
                table[current.tablename] = [current.counter]
            }else if(!current.tablename.includes(current.counter)){
                table[current.tablename].push(current.counter)
            }
            return table
        }, {})).map(([tablename, counters]) => ({tablename: tablename , counters: counters}))

        let data = null
        for(let i = 0; i < queryCountersByTable.length; i++){
            let queryBlended =  await db.query(`SELECT ${appContext.objectDate.date} as date , ${queryCountersByTable[i].counters.map(counter => `sum(${counter}) as ${counter}`).join(" , ")} FROM ${queryCountersByTable[i].tablename} WHERE ( [${appContext.objectDate.date}] between '${startDate}' and  '${moment(endDate).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ) and ( ${sites.split(";").map(site => `${appContext.objectDate.object} LIKE '${site}%'`).join(" or ")} ) GROUP BY ${appContext.objectDate.date} ORDER BY ${appContext.objectDate.date}`)
            if(queryBlended.status === 'Ok'){
                if(data === null){
                    data = queryBlended.result
                }else{
                    queryBlended.result.forEach(row => {
                        // outer join operation
                        let item = data.find(datarow => datarow['date'] === row['date'])
                        if(item){
                            Object.assign(item, row)
                        }else{
                            data.push(row)
                        }
                    })
                }
            }
        }

        // normalize empty data
        let defaultCounters = Array.from(new Set(queryCountersByTable.flatMap(entry => entry.counters)))
        for(let i = 0; i < data.length; i++){
            defaultCounters.forEach(counter  => {
                if(!(counter in data[i])){
                    data[i][counter] = 0
                }
            })
        }

        data.forEach(row => {
            row['date'] = moment(row['date']).format("YYYY-MM-DD")
            row['site'] = sites
        })

        _kpiTable.push(
            {   
                name: 'Blended KPI',
                table: pivot(data.slice(), 'site' , configBlended.series.map(series => series.name) , configBlended.series.map(series => series.formula))
            }
        )
        let datatable = pivot(data , 'date', configBlended.series.map(series => series.name) , configBlended.series.map(series => series.formula), [])
        let id = Math.random().toString('26').slice(2)
        let _chartsBlended = chart(datatable , 'Blended Traffice (2G + 3G)' , 'line' , {
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
                            if(_chart){
                                console.log(`Saving chart [${chartId}] from`)
                                console.log(_chartList)
                                _chart.yAxis[0]['min'] = minValue
                                _chart.yAxis[0]['max'] = maxValue
                                setChartsBlended(_chartList)
                            }
                        }
                    })
                }
            }
        })
        _chartsBlended['exporting'] = {
            buttons:{
                contextButton: []
            }
        }
        setChartsBlended([_chartsBlended])
        setkpitable(_kpiTable)
        freezeContext.setFreeze(false)
    }

    const tab2g = {
        menuItem: 'KPI 2G', render: () => (<Tab.Pane className="customize-pane" style={{height:'calc ( 100vh - 170px )'}}>
            {charts2g.map((chart, chartid)=>{
                return <HighchartsReact key={chartid} immutable={true} highcharts={Highcharts} options={chart} containerProps={{style:{height: '300px'}}} />
            })}
        </Tab.Pane>)
    }

    const tab3g = {
        menuItem: 'KPI 3G', render: () => (<Tab.Pane className="customize-pane" style={{height:'calc ( 100vh - 170px )'}}>
            {charts3g.map((chart, chartid)=>{
                return <HighchartsReact key={chartid} immutable={true} highcharts={Highcharts} options={chart} containerProps={{style:{height: '300px'}}} />
            })}
        </Tab.Pane>)
    }

    const tab4g = charts4g.map(layerRow => {
        return {
            menuItem: `KPI 4G [${layerRow.layer}]`, render: () => (<Tab.Pane className="customize-pane" style={{height:'calc ( 100vh - 170px )'}}>
                {layerRow.charts.map((chart, chartid)=>{
                    return <HighchartsReact key={chartid} immutable={true} highcharts={Highcharts} options={chart} containerProps={{style:{height: '300px'}}} />
                })}
            </Tab.Pane>)
        }
    })

    const tabBlended = {
        menuItem: 'KPI Blended', render: () => (<Tab.Pane className="customize-pane" style={{height:'calc ( 100vh - 170px )'}}>
            {chartsBlended.map((chart, chartid)=>{
                return <HighchartsReact key={chartid} immutable={true} highcharts={Highcharts} options={chart} containerProps={{style:{height: '300px'}}} />
            })}
        </Tab.Pane>)
    }

    const tabKpiTable = {
        menuItem: 'KPI Table', render: () => (<Tab.Pane className="customize-pane" style={{height: 'calc ( 100vh - 170px '}}>
            {kpitable.map((tableInfo, tableIndex) => <Table celled striped key={`table-${tableIndex}`}>
                <Table.Header>
                    <Table.Row>
                        <TableHeaderCell colSpan={tableInfo.table[0].length}>{tableInfo.name}</TableHeaderCell>
                    </Table.Row>
                    <Table.Row>
                        {tableInfo.table[0].map((tableHeader,tableHeaderIndex) => <TableHeaderCell key={`header-${tableHeaderIndex}`}>{tableHeader}</TableHeaderCell>)}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {tableInfo.table.slice(1).map((tableRow,tableRowIndex)=>
                        <Table.Row key={tableRowIndex}>
                            {tableRow.map((tableCell,tableCellIndex) => <Table.Cell key={tableCellIndex}>{typeof tableCell === 'number' ? parseFloat(tableCell.toFixed(2)) : tableCell}</Table.Cell>)}
                        </Table.Row>
                    )}
                    
                </Table.Body>
            </Table>)}
        </Tab.Pane>)
    }
    
    return <div style={{height:'calc( 100vh - 97px )'}}>
        <div style={{display: 'flex', alignItems: 'center'}}>
            <Form style={{flexGrow:1}}>
                <Form.Group widths="equal">
                    <Form.Input defaultValue={startDate} size="small" type='date' label="Start date" max={endDate}  onBlur={(e)=>setStartDate(e.target.value)} />
                    <Form.Input defaultValue={endDate} size="small" type='date' label="End date" min={startDate}  onBlur={(e)=>setEndDate(e.target.value)} />
                    <Form.Input defaultValue={localStorage.getItem("historySites") !== null ? localStorage.getItem("historySites") : "1011A"} size="small" type='text' label="Site/Cell" placeholder="Enter sites/cell" onBlur={(e)=>{
                        setSites(e.target.value);
                        localStorage.setItem("historySites", e.target.value)
                    }}/> 
                </Form.Group>
            </Form>
            <div style={{marginLeft: '10px'}}><Button onClick={()=>queryAction()}>Query</Button></div>
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
                        }}>Blended Chart setting</Menu.Item>
                        <Menu.Item name="export-report" onClick={()=>{
                            freezeContext.setFreeze(true, 'Exporting...')
                            let operations = []
                            let i = 0

                            if(charts2g.filter(chart => chart.series.length > 0).length > 0){
                                operations.push({operation: 'chart', highchart: charts2g , width: 823 , height:272 , x: i*830, column: 1})
                                i++;
                            }

                            if(charts3g.filter(chart => chart.series.length > 0).length > 0){
                                operations.push({operation: 'chart', highchart: charts3g , width: 823 , height:272 , x: i*830, column: 1})
                                i++;
                            }

                            charts4g.forEach((chart) => {
                                operations.push({
                                    operation: 'chart', highchart: chart.charts , width: 823 , height:272 , x: i*830, column: 1
                                })
                                i++;
                            })

                            if(chartsBlended.length === 1){
                                if(chartsBlended[0].xAxis.categories.length > 0){
                                    operations.push({
                                        operation: 'chart', highchart: chartsBlended , width: 823 , height:272 , x: i * 830, column: 1
                                    })
                                    i++;
                                }
                            }
                            console.log(operations)

                            if(exportedRaw2G.length > 0){
                                operations.push({operation: 'add_new_sheet', name: "RAW2G"})
                                operations.push({operation: 'write', data: exportedRaw2G, row: 1 , col: 1})
                            }

                            if(exportedRaw3G.length > 0){
                                operations.push({operation: 'add_new_sheet', name: "RAW3G"})
                                operations.push({operation: 'write', data: exportedRaw3G, row: 1 , col: 1})
                            }

                            console.log(exportedRaw4G)
                            if(exportedRaw4G.length > 0){
                                operations.push({operation: 'add_new_sheet', name: "RAW4G"})
                                operations.push({operation: 'write', data: exportedRaw4G, row: 1 , col: 1})
                            }
                            db.excelService(operations).finally(()=>{
                                freezeContext.setFreeze(false)
                            })
                            setShowMore(false)
                        }}>Export report</Menu.Item>
                    </Menu>
                    
                )}
            </Overlay>
        </div>
        <Tab menu={{fluid:true, vertical: true, tabular: true}} grid={{tabWidth:2, paneWidth: 14}} panes={[tab2g , tab3g , ...tab4g , tabBlended , tabKpiTable]} />
        
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
                header:'Default grouping',
                field: 'grouplevel',
                edit: true,
                editType: 'list',
                editListOptions: ['site', 'cell'] 
            } ,{
                header: 'Format', 
                field: 'formatting', 
                edit: true, 
                editType: 'list',
                editListOptions: ['general', 'percentage']
            }]}
            onHide={()=>setChart2GSetting(false)} 
            refreshing={()=>{
                load2GChartConfig().then((config)=>{
                    setConfig2G(config)
                })
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
                header:'Default grouping',
                field: 'grouplevel',
                edit: true,
                editType: 'list',
                editListOptions: ['site','sector','cell'] 
            } ,{
                header: 'Format', 
                field: 'formatting', 
                edit: true, 
                editType: 'list',
                editListOptions: ['general', 'percentage']
            }]}
            onHide={()=>setChart3GSetting(false)} 
            refreshing={()=>{
                console.log('reapply to chart')
                load3GChartConfig().then((config)=>{
                    setConfig3G(config)
                })
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
                header: 'Default grouping', 
                field: 'grouplevel', 
                edit: true, 
                editType: 'list', 
                editListOptions: ['site', 'cell']
            },{
                header: 'Format', 
                field: 'formatting', 
                edit: true, 
                editType: 'list',
                editListOptions: ['general', 'percentage']
            }]}
            onHide={()=>setChart4GSetting(false)} 
            refreshing={()=>{
                console.log('reapply to chart')
                load4GChartConfig().then((config)=>{
                    setConfig4G(config)
                })
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
                loadBlendedChartConfig().then(async (config)=>{
                    let blendedSetting = config
                    let rawcounter = []
                    blendedSetting.forEach(setting  => {
                        let regex = RegExp(`(${['sum','avg'].join("|")})\\((?<counter>\\w+)\\)`, 'g')
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

                    setConfigBlended({
                        rawcounter: rawcounter, 
                        series: config
                    })
                })
            }}
        />
        
        <ChartConfigModal show={chart2GConfig.show} onHide={()=>{
            setChart2GConfig({show: false , min:null , max: null , chartId: null, save: null })
        }} min={chart2GConfig.min} max={chart2GConfig.max} chartId={chart2GConfig.chartId} save={chart2GConfig.save} chartlist={charts2g} />
        <ChartConfigModal show={chart3GConfig.show} onHide={()=>{
            setChart3GConfig({show: false , min:null , max: null , chartId: null, save: null })
        }} min={chart3GConfig.min} max={chart3GConfig.max} chartId={chart3GConfig.chartId} save={chart3GConfig.save} chartlist={charts3g} />
        <ChartConfigModal show={chart4GConfig.show} onHide={()=>{
            setChart4GConfig({show: false , min:null , max: null , chartId: null, save: null })
        }} min={chart4GConfig.min} max={chart4GConfig.max} chartId={chart4GConfig.chartId} save={chart4GConfig.save} chartlist={charts4g} />
        <ChartConfigModal show={chartBlendedConfig.show} onHide={()=>{
            setChartBlendedConfig({show: false , min:null , max: null , chartId: null, save: null })
        }} min={chartBlendedConfig.min} max={chartBlendedConfig.max} chartId={chartBlendedConfig.chartId} save={chartBlendedConfig.save} chartlist={chartsBlended} />

    </div>

}

export default AntennaSwapReport