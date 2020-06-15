import React from 'react';

import { Form , Col, Button, Accordion , Card , Spinner , Dropdown } from 'react-bootstrap';
import SelectableContext from "react-bootstrap/SelectableContext";
import * as moment from 'moment';
import { Database } from './Database';
import Chart from "./Chart";

import * as firebase from 'firebase/app';
// Add the Performance Monitoring library
import "firebase/performance";

const pivot = (data, key, category, val, filter = []) => {
    // filter data 
    if(filter.length > 0){
        data = data.filter(row => filter.includes(row[category]))
    }

    const _key = Array.from(new Set(data.map(row => row[key])))
    const _cat = Array.from(new Set(data.map(row => row[category])))
    // Dimension  = _key + 1 x _cat [ row  * column]
    let table = (new Array(_key.length+1))
    for(let i=0; i < table.length; i++){
      if(i === 0){
        table[i] = [key, ..._cat ]
      }else{
        table[i] = (new Array(_cat.length + 1)).fill(0)
        table[i][0] = _key[i-1]
      }
    }

    // Allocate Value 
    for(let i=0; i < data.length ; i ++){
      const rowIndex = _key.indexOf(data[i][key])
      const columnIndex = _cat.indexOf(data[i][category])
      if(rowIndex !== -1 && columnIndex !== -1){
        table[rowIndex+1][columnIndex+1] = data[i][val]
      }
    }
    return table
}

class KpiGraph extends React.Component{
    constructor(props){
        super(props)

        this.state = {
            mrlayercharts: [],
            mrmaincharts: [],
            bisectorcharts: [],
            celllist: [],
            bisector1:'',
            bisector2:'',
            result: [],
            querying: false, 
        }
        this.handleFormSubmit = this.handleFormSubmit.bind(this)

        // Initialize Performance Monitoring and get a reference to the service
        this.perf = firebase.performance();
    }

    handleFormSubmit(event){
        event.preventDefault();
        event.stopPropagation();

        this.setState({querying: true})

        const form = event.currentTarget;
        const startDate = form.querySelector("#form-graph-mr-startdate").value
        const endDate = form.querySelector("#form-graph-mr-enddate").value
        const site = form.querySelector("#form-graph-mr-site").value
        
        let kpiSelect = this.props.mrlayerlist.map(entry => `${entry.seriesformula} as [${entry.seriesname}]`)
        let mainKpi = this.props.mrmainlist.map(entry => `${entry.seriesformula} as [${entry.seriesname}]`)

        kpiSelect = [...kpiSelect , ...mainKpi]

        let queryString = `SELECT Date([Date]) as [Time], strftime('%H:%M', [time]) as [bhtime], Cell_Name as [Entity], ${kpiSelect.join(",")} FROM ${this.props.project.tablename} WHERE Date([Date]) >= '${startDate}' and Date([Date]) <= '${endDate}' and [Cell_Name] LIKE '${site}%' GROUP BY Date([Date]) , [Cell_Name]`
        
        const trace = this.perf.trace('kpi_query')
        trace.start()
        let db = new Database()
        db.query(queryString).then((response)=>{
            if(response.status === "Ok"){
                let result = response.result 
                if(result.length === 0 ){
                    this.props.handleSnackMessage("No data found")
                    return
                }

                // Replaceing _INT with ""
                result.forEach(row => {
                    row.Entity = row.Entity.replace("_INT","")
                })

                let celllist = Array.from(new Set(result.map(row => row.Entity)))
                

                let sectors = result.reduce((group, row) => {
                    // Replaceing _INT with ""
                    row.Entity = row.Entity.replace("_INT","")
                    
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

                

                let mrmaincharts = this.props.mrmainlist.map(entry => {
                    //console.log(entry)
                    let table = pivot(result , "Time", "Entity", entry.seriesname)
                    //console.log(table)
                    let chartOptions = {
                        chart:{
                            type:'line'
                        },
                        title:{
                            text: entry.title, 
                        },
                        xAxis: {
                            categories: table.slice(1).map(row => row[0])
                        },
                        series:[...table[0].slice(1).map((entity , i) =>{
                            return {name: entity, data:table.slice(1).map(row => row[i+1]).map(value => value===null?0:value)}
                        }), ...(entry.baselinetitle && entry.baselinevalue? [
                            {name:entry.baselinetitle,data:table.slice(1).map( _ => entry.baselinevalue),dashStyle:'dash',marker:{enabled:false},color:'red'}
                        ] : [])],
                        legend:{
                            align: 'right',
                            verticalAlign: 'middle',
                            layout: 'vertical'
                        }
                    }

                    return chartOptions
                })

                let mrlayercharts = this.props.mrlayerlist.map(entry => {
                    //console.log(`Generate chart ${entry.title}`)
                    let chartOptions = Object.values(sectors).map(rows => {
                        let table = pivot(rows, "Time", "Entity", entry.seriesname)
                        //console.log(table)
                        return {
                            chart:{
                              type:'line'
                            },
                            title:{
                              text: entry.title, 
                            },
                            xAxis: {
                              categories: table.slice(1).map(row => row[0])
                            },
                            series:table[0].slice(1).map((entity , i) =>{
                              return {name: entity, data:table.slice(1).map(row => row[i+1]).map(value => value===null?0:value)}
                            }),
                            tooltip:{
                                formatter: function(){
                                    let date = this.x // string 
                                    let value = this.y // value 
                                    let name = this.series.name
                                    let bhtime = result.find(row => row.Entity === name && row.Time === date) ? result.find(row => row.Entity === name && row.Time === date).bhtime : "No data"
                                    return "<em>" + date + "</em><br />" + name + ":<b>" + value + "</b><br />BH Hour: <b>" + bhtime + "</b>" ;
                                }
                            }
                        }
                    })
                    return {
                        chart: entry.title,
                        chartOptions: chartOptions
                    }
                })

                //console.log(mrlayercharts)
                //console.log(mrmaincharts)
                this.setState({mrlayercharts: mrlayercharts, mrmaincharts:mrmaincharts, celllist:celllist, result: result})
            }
        }).finally(()=>{
            this.setState({querying:false})
            trace.stop();
        })
    }

    handleBisectorchart(field, value){

        
        let { bisector1, bisector2, result }  = this.state 

        if(field === 1){
            bisector1 = value 
        }else if(field === 2){
            bisector2 = value 
        }

        if(bisector1 !== '' && bisector2 !== ''){
            let bisectorcharts = this.props.bisectorlist.map(entry => {
                let table = pivot(result, "Time", "Entity", entry.seriesname, [bisector1 , bisector2])
                let chartOptions = {
                    chart:{
                        type:'line'
                    },
                    title:{
                        text: entry.title, 
                    },
                    xAxis: {
                        categories: table.slice(1).map(row => row[0])
                    },
                    series:[...table[0].slice(1).map((entity , i) =>{
                        return {name: entity, data:table.slice(1).map(row => row[i+1]).map(value => value===null?0:value)}
                    }), ...(entry.baselinetitle && entry.baselinevalue? [
                        {name:entry.baselinetitle,data:table.slice(1).map( _ => entry.baselinevalue),dashStyle:'dash',marker:{enabled:false},color:'red'}
                    ] : [])],
                    legend:{
                        align: 'right',
                        verticalAlign: 'middle',
                        layout: 'vertical'
                    }
                }
    
                return chartOptions
            })
            this.setState({bisector1:bisector1, bisector2:bisector2, bisectorcharts: bisectorcharts})
        }else{
            this.setState({bisector1:bisector1, bisector2:bisector2})
        }
        

    }
    
    exportChartToExcel(){
        const trace = this.perf.trace('export_kpigraph_excel')
        trace.start()
        // chart size 8 columns (A - H) x 15 rows (1 - 16)
        // export mrlayercharts
        let chartArray = []
        let currentRow = 1
        let currentColumn = 'A'
        for(let i=0,chartGroup; chartGroup = this.state.mrlayercharts[i] ; i++ ){
            
            for(let j=0,chart; chart = chartGroup.chartOptions[j]; j++){
                let chartTitle = chart.title.text 

                let seriesArray = chart.series.map(series => {
                    return `{"name":"\\"${series.name}\\"","categories":"{${chart.xAxis.categories.map(cat => `\\"${cat}\\"`).join(",")}}","values":"{${series.data.join(",")}}"}`
                })

                let chartString = [
                    "Layer Chart",
                    `${currentColumn}${currentRow}`,
                    `{"type":"line","series":[${seriesArray.join(",")}],"title":{"name":"${chartTitle}"},"y_axis":{"major_grid_lines":true,"color":"#000000"}}`
                ] 

                //console.log(chartString)
                chartArray.push(chartString)

                if(currentColumn === 'A'){
                    currentColumn = "I"
                }else{
                    currentColumn = "A"
                    currentRow += 15
                }
            }

            if(currentColumn !== 'A'){
                currentColumn = "A"
                currentRow += 17
            }else{
                currentRow += 1
            }
        }

        
        // export mrmaincharts 
        currentRow = 1
        currentColumn = 'A'
        for(let j=0,chart; chart = this.state.mrmaincharts[j]; j++){
            let chartTitle = chart.title.text 

            let seriesArray = chart.series.map(series => {
                return `{"name":"\\"${series.name}\\"","categories":"{${chart.xAxis.categories.map(cat => `\\"${cat}\\"`).join(",")}}","values":"{${series.data.join(",")}}"}`
            })

            let chartString = [
                "BH Main KPI",
                `${currentColumn}${currentRow}`,
                `{"type":"line","series":[${seriesArray.join(",")}],"title":{"name":"${chartTitle}"},"y_axis":{"major_grid_lines":true,"color":"#000000"}}`
            ] 

            chartArray.push(chartString)

            if(currentColumn === 'A'){
                currentColumn = "I"
            }else{
                currentColumn = "A"
                currentRow += 15
            }
        }

        // export bisectorcharts
        currentRow = 1
        currentColumn = 'A'
        for(let j=0,chart; chart = this.state.bisectorcharts[j]; j++){
            let chartTitle = chart.title.text 

            let seriesArray = chart.series.map(series => {
                return `{"name":"\\"${series.name}\\"","categories":"{${chart.xAxis.categories.map(cat => `\\"${cat}\\"`).join(",")}}","values":"{${series.data.join(",")}}"}`
            })

            let chartString = [
                "BiSector KPI",
                `${currentColumn}${currentRow}`,
                `{"type":"line","series":[${seriesArray.join(",")}],"title":{"name":"${chartTitle}"},"y_axis":{"major_grid_lines":true,"color":"#000000"}}`
            ] 

            chartArray.push(chartString)

            if(currentColumn === 'A'){
                currentColumn = "I"
            }else{
                currentColumn = "A"
                currentRow += 15
            }
        }

        let str2bytes = (str) => {
            var bytes = new Uint8Array(str.length)
            for (var i=0; i<str.length; i++){
                bytes[i] = str.charCodeAt(i);
            }
            return bytes;
        }

        if(window.excel){
            let blob = new Blob([str2bytes(atob(window.excel(chartArray)))],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
            let elem = window.document.createElement("a")
            elem.href = window.URL.createObjectURL(blob)
            elem.download = 'export.xlsx'
            elem.click()
        }else{
            trace.incrementMetric('wasm_error')
            this.props.handleSnackMessage("Export function not supported.")
        }
        trace.stop()
    }

    render(){
        const { mrlayercharts , mrmaincharts , querying, celllist, bisector1, bisector2, bisectorcharts } = this.state  
        let defaultDate = moment(new Date()).startOf("day").subtract(1, "day").format("YYYY-MM-DD")
        return (
        <div>
            <Form onSubmit={this.handleFormSubmit}>
                <Form.Row>
                    <Form.Group as={Col} controlId="form-graph-mr-startdate">
                        <Form.Label>Start Date</Form.Label>
                        <Form.Control required type="date" defaultValue={defaultDate}/>
                    </Form.Group>

                    <Form.Group as={Col} controlId="form-graph-mr-enddate">
                        <Form.Label>End Date</Form.Label >
                        <Form.Control required type="date" defaultValue={defaultDate}/>
                    </Form.Group>

                    <Form.Group as={Col} controlId="form-graph-mr-site">
                        <Form.Label>Site</Form.Label>
                        <Form.Control required type="text" placeholder="Eg. TNLTM" />
                    </Form.Group>
                </Form.Row>

                <div style={{display:'flex', justifyContent:"space-between"}}>
                    <Button type="submit" disabled={querying}>
                        {querying && <Spinner
                            as="span"
                            animation="grow"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                        />}
                        {querying && "Querying"}
                        {!querying && "Query"}
                    </Button>
                
                    {(mrlayercharts.length > 0 || mrmaincharts.length > 0 || bisectorcharts.length > 0) && <Button onClick={()=>{this.exportChartToExcel()}}>
                        Export to Excel
                    </Button>}

                    {celllist.length > 0 && <SelectableContext.Provider value={false}>
                        <Dropdown drop="down">
                            <Dropdown.Toggle>
                                {!!bisector1? bisector1: 'Select Bisector Cell 1'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                {celllist.map((cell,cellindex) => {
                                    return <Dropdown.Item key={cellindex} eventKey={cell} onSelect={(evtKey)=>{this.handleBisectorchart(1, evtKey)}}>{cell}</Dropdown.Item>
                                })}
                            </Dropdown.Menu>
                        </Dropdown>

                        <Dropdown drop="down">
                            <Dropdown.Toggle>
                                {!!bisector2? bisector2: 'Select Bisector Cell 2'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu style={{zIndex:'1000'}}>
                                {celllist.map((cell,cellindex) => {
                                    return <Dropdown.Item key={cellindex} eventKey={cell} onSelect={(evtKey)=>{this.handleBisectorchart(2, evtKey)}}>{cell}</Dropdown.Item>
                                })}
                            </Dropdown.Menu>
                        </Dropdown>
                    </SelectableContext.Provider>}
                </div>
                
            </Form>
            <Accordion style={{marginTop:'10px'}}>
                <Card>
                    <Accordion.Toggle as={Card.Header} eventKey="0">
                        BH Layer KPI
                    </Accordion.Toggle>
                    <Accordion.Collapse eventKey="0">
                        <Card.Body>
                            {mrlayercharts.map((chart, chartid) => {
                                return (<div key={`chart_layer_${chartid}`} style={{display:'flex', flexDirection: 'row', flexWrap:'wrap', justifyContent:'center', borderBottom:'1px solid #cacaca'}}>
                                    {chart.chartOptions.map((option,optionid)=> {
                                        return (
                                        <div key={`sector_${optionid}`} style={{width:'calc( 50% - 20px )',  border: '1px solid #cacaca', margin: '10px'}}>
                                            <Chart style={{width:'inherit', height:'inherit'}} options={option} />
                                        </div>)})}
                                </div>)
                            })}
                            {mrlayercharts.length ===  0 && <div>No Data</div>}
                        </Card.Body>
                    </Accordion.Collapse>
                    
                </Card>
                <Card>
                    <Accordion.Toggle as={Card.Header} eventKey="1">
                        BH Main KPI
                    </Accordion.Toggle>
                    <Accordion.Collapse eventKey="1">
                        <Card.Body>
                            {mrmaincharts.map((chartOptions, chartid) => {
                                return <Chart style={{width:'inherit', height:'inherit'}} options={chartOptions} key={chartid}/>
                            })}
                            {mrlayercharts.length ===  0 && <div>No Data</div>}
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>
                {bisector1 !== '' && bisector2  !=='' && <Card style={{overflow:'auto'}}>
                    <Accordion.Toggle as={Card.Header} eventKey="2">
                        Bisector KPI
                    </Accordion.Toggle>
                    <Accordion.Collapse eventKey="2">
                        <Card.Body>
                            {bisectorcharts.map((chartOptions, chartid) => {
                                return <Chart style={{width:'inherit', height:'inherit'}} options={chartOptions} key={chartid}/>
                            })}
                            {bisectorcharts.length ===  0 && <div>
                                {this.props.bisectorlist.length === 0? 'Bisector charts are not defined.': 'No data'}
                                </div>}
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>}
            </Accordion>
        </div>)
    }
}

export default KpiGraph;