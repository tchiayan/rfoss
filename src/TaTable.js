import React from 'react';

import { Form , Col, Button,  Spinner } from 'react-bootstrap';
import * as moment from 'moment';
import { Database } from './Database';
import Chart from './Chart';

// Ag-grid Import
import { AgGridReact } from '@ag-grid-community/react';
import {AllCommunityModules} from '@ag-grid-community/all-modules';
import '@ag-grid-community/all-modules/dist/styles/ag-grid.css';
import '@ag-grid-community/all-modules/dist/styles/ag-theme-balham.css';


// Excel 
import Excel from 'exceljs'

class TaTable extends React.Component{
    constructor(){
        super()

        this.state = {
            querying: false,
            taTable: [],
            taGraph: []
        }

        this.handleFormSubmit = this.handleFormSubmit.bind(this)
    }

    handleFormSubmit(event){
        event.preventDefault()
        event.stopPropagation()

        this.setState({querying:true})

        const form = event.currentTarget;
        const date = form.querySelector("#form-ta-table-query-date").value 
        const site = form.querySelector("#form-ta-table-query-site").value 

        let talist = this.props.tatablelist.map(entry => `${entry.seriesformula} as [${entry.title}]`)
        let tagraphlist = this.props.tagraphlist.map(entry => `${entry.seriesformula} as [${entry.title}]`)
        console.log(tagraphlist)
        let db = new Database()
        db.query(`SELECT Date([Date]) as [Date], [eNodeB_Name], [Cell_FDD_TDD_Indication] , [Cell_Name] ${talist.length > 0?",":""} ${talist.join(",")} FROM ${this.props.project.tablename} WHERE Date([Date]) = Date('${date}') and [Cell_Name] LIKE '${site}%' GROUP BY Date([Date]) , [Cell_Name]`).then((response)=>{
            if(response.status === "Ok"){
                //console.log(response.result)
                if(response.result.length > 0){
                    let header = ["Date","eNodeB_Name","Cell_FDD_TDD_Indication","Cell_Name", ...this.props.tatablelist.map(entry => entry.title)]
                    let table = []
                    table.push(header)

                    response.result.forEach(row => {
                        table.push(
                            header.map(column => row[column]===null?0:(isNaN(row[column])?row[column]:row[column].toFixed(2)+"%"))
                        )
                    })

                    this.setState({taTable: table})

                    let queryGraph = `Select [Cell_Name] as [Cell Name] ${tagraphlist.length > 0?",":""} ${tagraphlist.join(",")} FROM ${this.props.project.tablename} WHERE Date([Date]) = Date('${date}') and [Cell_Name] LIKE '${site}%' GROUP BY [Cell_Name]`
                    return db.query(queryGraph)
                }else{  
                    throw Error("No data found")
                }
                
            }
        }).then((response)=>{
            
            if(response.status === "Ok"){
                if(response.result.length > 0){
                    let header = ["Cell Name", ...this.props.tagraphlist.map(entry => entry.title)]
                    let table = [header]

                    response.result.forEach(row => {
                        table.push(header.map(column => row[column]))
                    })
                    //console.log("TA Graph Response: ")
                    //console.log(table[0].map((col, i) => table.map(row => row[i])))
                    table = table[0].map((col, i) => table.map(row => row[i]))
                    this.setState({taGraph:table})
                }else{
                    throw Error("No data found")
                }
            }
        }).catch((error)=>{
            this.props.handleSnackMessage("No data found")
        }).finally(()=>{
            this.setState({querying:false})
        })
    }
    render(){
        const {
            querying,
            taTable,
            taGraph,
        } = this.state

        let columnDefs, rowData
        if(taTable.length > 0 ){
            console.log(taTable)
            let header = taTable[0]

            columnDefs = taTable[0].map(column => {
                return {headerName:column, field:column, resizable: true}
            })

            rowData = taTable.slice(1).map(row => {
                return row.reduce((obj, column, ind)=> {
                    obj[header[ind]] = column 
                    return obj
                }, {})
            })
        }
        let defaultDate = moment(new Date()).startOf("day").subtract(1, 'day').format("YYYY-MM-DD")
        
        return (
            <div>
                <Form onSubmit={this.handleFormSubmit}>
                    <Form.Row>
                        <Form.Group as={Col} controlId="form-ta-table-query-date">
                            <Form.Label>End Date</Form.Label >
                            <Form.Control required type="date" defaultValue={defaultDate}/>
                        </Form.Group>

                        <Form.Group as={Col} controlId="form-ta-table-query-site">
                            <Form.Label>Site</Form.Label>
                            <Form.Control required type="text" placeholder="Eg. TNLTM" />
                        </Form.Group>
                    </Form.Row>
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
                </Form>
                {!!columnDefs && <div className="ag-theme-balham" style={{width: "100%", height: "200px", margin:"14px 0px"}}> 
                    <AgGridReact 
                        columnDefs = {columnDefs}
                        modules={AllCommunityModules}
                        rowData={rowData}
                        onGridReady={(params)=>{
                            params.api.sizeColumnsToFit();
                        }}
                    />
                </div>}
                {!!columnDefs && <div>
                    <Button onClick={()=>{
                        let wb = new Excel.Workbook()
                        let ws = wb.addWorksheet("TA Table")
                        ws.addRows(taTable)

                        wb.xlsx.writeBuffer().then((buffer) => {
                            let blob = new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
                            let elem = window.document.createElement("a")
                            elem.href = window.URL.createObjectURL(blob)
                            elem.download = 'TA.xlsx'
                            elem.click()
                        })
                    }}>Export</Button>
                </div>}
                {taGraph.length > 0 && <Chart table={taGraph} title={"TA"} style={{'border':'1px solid gray', marginTop:"10px"}}/>}
            </div>
        )
    }
}

export default TaTable