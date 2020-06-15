import React from 'react';

import { Form , Col, Button, Spinner } from 'react-bootstrap';
import * as moment from 'moment';
import { Database } from './Database';
import Excel from 'exceljs';

function ExportRawData(props){
    const [ querying, setQuering ] = React.useState(false)

    const handleFormSubmit = async (event) => {
        event.preventDefault()
        event.stopPropagation()

        const form = event.currentTarget;
        const startdate = form.querySelector("#form-raw-data-startdate").value
        const enddate = form.querySelector("#form-raw-data-enddate").value
        const site = form.querySelector("#form-raw-data-objectfilter").value


        // verify enddate is more than startdate
        if(moment(enddate).diff(moment(startdate)) < 0){
            props.handleSnackMessage('Incorrect date range!')
            return 
        }

        setQuering(true)

        let db = new Database()
        

        let wb = new Excel.Workbook()
        let ws = wb.addWorksheet("data")
        let lines = []
        // query day by day 
        let queryDate = moment(startdate).clone()

        while(moment(enddate).diff(queryDate) >= 0){
            let query = `SELECT * FROM ${props.project.tablename} WHERE Date([Date]) = Date('${queryDate.format('YYYY-MM-DD')}') ${site ? `and [Cell_Name] LIKE '${site}%'`: ''}`
            //console.log(query)
            let response = await db.querybig(query)

            if(response.status === 'Ok'){
                let data = JSON.parse(response.result)
                if(lines.length === 0 && data.length > 0){
                    lines = [Object.keys(data[0]).slice(1).join(",")]
                }
                lines = [...lines, ...data.map(row => Object.values(row).slice(1).join(","))]
                //ws.addRows(data.map(row => Object.values(row).slice(1)))
            }
            queryDate.add(1, 'days')
        }
        
        let blob = new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8;"})
        let elem = window.document.createElement("a")
        elem.href = window.URL.createObjectURL(blob)
        elem.download = 'rawdata_export.csv'
        elem.click()
        /*wb.xlsx.writeBuffer().then((buffer) => {
            let blob = new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
            let elem = window.document.createElement("a")
            elem.href = window.URL.createObjectURL(blob)
            elem.download = 'rawdata_export.xlsx'
            elem.click()
        })*/
        
        setQuering(false)
        /*db.querybig(query).then((response)=>{
            if(response.status === 'Ok'){
                let data = JSON.parse(response.result)

                let wb = new Excel.Workbook()
                let ws = wb.addWorksheet("data")

                if(data.length > 0 ){
                    ws.addRow(Object.keys(data[0]).slice(1))
                }

                ws.addRows(data.map(row => Object.values(row).slice(1)))
                wb.xlsx.writeBuffer().then((buffer) => {
                    let blob = new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
                    let elem = window.document.createElement("a")
                    elem.href = window.URL.createObjectURL(blob)
                    elem.download = 'rawdata_export.xlsx'
                    elem.click()
                })
            }else{
                throw Error("Query error")
            }
        }).catch((error)=>{
            props.handleSnackMessage(error.message)
        }).finally(()=>{
            setQuering(false)
        })*/
    }

    return <div>
        <Form onSubmit={handleFormSubmit}>
            <Form.Row>
                <Form.Group as={Col} controlId="form-raw-data-startdate">
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control required type="date" />
                </Form.Group>

                <Form.Group as={Col} controlId="form-raw-data-enddate">
                    <Form.Label>End Date</Form.Label>
                    <Form.Control required type="date" />
                </Form.Group>

                <Form.Group as={Col} controlId="form-raw-data-objectfilter">
                    <Form.Label>Filter Site/Cell</Form.Label>
                    <Form.Control type="text" placeholder="Eg. 'TNLTM' or empty to select all cells" />
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
    </div>
}

export default ExportRawData