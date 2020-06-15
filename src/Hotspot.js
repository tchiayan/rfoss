import React from 'react';

import { Form , Col, Button,  Spinner } from 'react-bootstrap';
import * as moment from 'moment';
import { Database } from './Database';
import Excel from 'exceljs';

class Hotspot extends React.Component{
    constructor(){
        super()
        this.state = {
            querying: false
        }
        this.handleFormSubmit = this.handleFormSubmit.bind(this)
    }

    toColumnName(num) {
        for (var ret = '', a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
            ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret;
        }
        return ret;
    }

    handleFormSubmit(event){
        event.preventDefault()
        event.stopPropagation()

        this.setState({querying:true})
        const form = event.currentTarget;
        const enddate = form.querySelector("#form-hotspot-enddate").value
        const site = form.querySelector("#form-hotspot-site").value
        const startdate = moment(enddate).subtract(13, 'days').format("YYYY-MM-DD")
        const queryHotspotKpi = [
            {
                title: 'PRB DL',
                formula: 'avg(PRB_Usage_DL)', 
            },{
                title: 'DL USER Rate',
                formula: 'avg(DL_User_Average_Throughput_Mbps)'
            }
        ]

        let db = new Database()
        let query = `SELECT Date([Date]) as [Date], [Cell_Name] as [Cell Name] , ${queryHotspotKpi.map(kpi => `${kpi.formula} as [${kpi.title}]`).join(",")} FROM main ${this.props.project.tablename} WHERE Date([Date]) >= Date('${startdate}') and Date([Date]) <= Date('${enddate}') and [Cell_Name] LIKE '${site}%' GROUP BY Date([Date]) , [Cell_Name]`
        db.querybig(query).then((response)=>{
            if(response.status === "Ok"){
                //console.log(response.result)
                console.log("Response status okay ")
                let data = JSON.parse(response.result)
                console.log('Row return: ', data.length)
                if(data.length === 0){
                    throw new Error("No data")
                }

                // Replaceing _INT with ""
                data.forEach(row => {
                    row['Cell Name'] = row['Cell Name'].replace("_INT","")
                })

                let uniqueDate = Array.from(new Set(data.map(entry => entry['Date'])))
                let uniqueObject = Array.from(new Set(data.map(entry => entry['Cell Name'])))

                if(uniqueDate.length !== 14){
                    throw new Error("Missing data, not enough 14 days data to generate Hotspot")
                }

                let formatedDate = uniqueDate.slice().map(date => moment(date).format("D-MMM"))
                let table = [["Cell Name", ...formatedDate , ...formatedDate]]
                uniqueObject.forEach(cell => table.push([cell , ...(new Array(formatedDate.length * 2).fill(""))]))
                for(let i=0; i < data.length; i++){
                    // Push PRB DL
                    let row = data[i]
                    if((table[uniqueObject.indexOf(row['Cell Name'])+1][uniqueDate.indexOf(row['Date'])+1] === "")){
                        table[uniqueObject.indexOf(row['Cell Name'])+1][uniqueDate.indexOf(row['Date'])+1] = row['PRB DL']
                    }

                    // Push DL USER Rate
                    if((table[uniqueObject.indexOf(row['Cell Name'])+1][uniqueDate.indexOf(row['Date'])+1+uniqueDate.length] === "")){
                        table[uniqueObject.indexOf(row['Cell Name'])+1][uniqueDate.indexOf(row['Date'])+1+uniqueDate.length] = row['DL USER Rate']
                    }
                    
                }

                //console.log(table.slice(0,6))

                let wb = new Excel.Workbook()
                let ws = wb.addWorksheet("Hotspot")

                ws.mergeCells(`B1:${this.toColumnName((table[0].length-1)/2+1)}1`)
                ws.getCell("B1").value =  "PRB DL"
                ws.getCell("B1").alignment = {vertical: 'middle', horizontal: 'center'}
                ws.getCell("B1").font = {bold:true}
                ws.getCell("B1").fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {argb:'FFFDE9D9'},
                    bgColor: {argb:'FFFDE9D9'}
                }

                ws.mergeCells(`${this.toColumnName((table[0].length-1)/2+2)}1:${this.toColumnName(table[0].length)}1`)
                ws.getCell(`${this.toColumnName((table[0].length-1)/2+2)}1`).value =  "DL User Rate"
                ws.getCell(`${this.toColumnName((table[0].length-1)/2+2)}1`).alignment = {vertical: 'middle', horizontal: 'center'}
                ws.getCell(`${this.toColumnName((table[0].length-1)/2+2)}1`).font = {bold:true}
                ws.getCell(`${this.toColumnName((table[0].length-1)/2+2)}1`).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {argb:'FFE5E0EA'},
                    bgColor: {argb:'FFE5E0EA'}
                }

                ws.mergeCells(`${this.toColumnName(table[0].length+1)}1:${this.toColumnName(table[0].length+3)}1`)
                ws.getCell(`${this.toColumnName(table[0].length+1)}1`).value =  "Hotspot (6 OUT OF 14 DAYS)"
                ws.getCell(`${this.toColumnName(table[0].length+1)}1`).alignment = {vertical: 'middle', horizontal: 'center'}
                ws.getCell(`${this.toColumnName(table[0].length+1)}1`).font = {bold:true}
                ws.getCell(`${this.toColumnName(table[0].length+1)}1`).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {argb:'FFC5A9F1'},
                    bgColor: {argb:'FFC5A9F1'}
                }

                //ws.addRows(table)
                const half = (table[0].length-1) / 2  
                
                for(let i=0, row; row = table[i]; i++){
                    //if(i >= 7) console.log(JSON.stringify(row))
                    for(let j=0 ; j < row.length ; j++){
                        let column = row[j]
                        if(i === 0){
                            ws.getCell(`${this.toColumnName(j+1)}${i+2}`).value = column
                        }else{
                            //if(i > 7) console.log(column)
                            ws.getCell(`${this.toColumnName(j+1)}${i+2}`).value = column
                            if(column !== ""){
                                if((j <= half && column > 70) || (j > half && column < 2)){
                                    ws.getCell(`${this.toColumnName(j+1)}${i+2}`).fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: {argb:'FFFFC7CE'},
                                        bgColor: {argb:'FFFFC7CE'}
                                    }
                                    ws.getCell(`${this.toColumnName(j+1)}${i+2}`).font = {
                                        color: {argb:'FF9C0000'}
                                    }
                                }
                            }
                            
                        }
                    } 
                }
                
                // PRB > 70
                let hotspot_prb_column = this.toColumnName(table[0].length+1)
                ws.getCell(`${hotspot_prb_column}2`).value = "PRB > 70%"
                ws.getCell(`${hotspot_prb_column}3`).value = {
                    formula: `COUNTIF(B3:${this.toColumnName((table[0].length-1)/2+1)}3,">70")`,
                    result: table[1].slice(1).reduce((total, acc)=> {
                        return total + (acc>70?1:0)
                    },0),
                    shareType: 'shared',
                    ref: `${hotspot_prb_column}3:${hotspot_prb_column}${table.length+2}`
                }
                for(let i=2; i < table.length; i++){
                    ws.getCell(`${hotspot_prb_column}${i+2}`).value = {
                        sharedFormula: `${hotspot_prb_column}3`,
                        result: table[i].reduce((total, acc)=> {
                            return total + (acc>70?1:0)
                        },0)
                    } 
                }

                //DL User Rate < 2 Mbps
                let hotspot_dl_user_rate_column = this.toColumnName(table[0].length+2)
                ws.getCell(`${hotspot_dl_user_rate_column}2`).value = "DL USER RATE < 2 Mbps"
                ws.getCell(`${hotspot_dl_user_rate_column}3`).value = {
                    formula: `COUNTIF(${this.toColumnName((table[0].length-1)/2+2)}3:${this.toColumnName(table[0].length)}3,"<2")`,
                    result: table[1].slice(1).reduce((total, acc)=> {
                        return total + (acc<2?1:0)
                    },0),
                    shareType: 'shared',
                    ref: `${hotspot_dl_user_rate_column}3:${hotspot_dl_user_rate_column}${table.length+2}`
                }
                for(let i=2; i < table.length; i++){
                    ws.getCell(`${hotspot_dl_user_rate_column}${i+2}`).value = {
                        sharedFormula: `${hotspot_dl_user_rate_column}3`,
                        result: table[i].reduce((total, acc)=> {
                            return total + (acc<2?1:0)
                        },0)
                    } 
                }

                //Final Decision Column
                let final_column = this.toColumnName(table[0].length+3)
                ws.getCell(`${final_column}2`).value = "FINAL"
                ws.getCell(`${final_column}3`).value = {
                    formula: `IF(AND(${hotspot_prb_column}3>=6,${hotspot_dl_user_rate_column}3>=6),"Y","N")`,
                    result: 'Y',
                    shareType: 'shared',
                    ref:`${final_column}3:${final_column}${table.length+2}`
                }
                for(let i=2; i < table.length; i++){
                    ws.getCell(`${final_column}${i+2}`).value = {
                        sharedFormula: `${final_column}3`,
                        result: 'Y'
                    }
                }

                wb.xlsx.writeBuffer().then((buffer) => {
                    let blob = new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
                    let elem = window.document.createElement("a")
                    elem.href = window.URL.createObjectURL(blob)
                    elem.download = 'hotspot.xlsx'
                    elem.click()
                })
            }else{
                throw new Error("Query error")
            }
        }).catch((error)=>{
            console.log(error)
            this.props.handleSnackMessage(error.message)
        }).finally(()=>{
            this.setState({querying:false})
        })
    }

    render(){
        const {
            querying
        } = this.state
        let defaultDate = moment(new Date()).startOf("day").subtract(1,'day').format("YYYY-MM-DD")
        
        return <div>
            <Form onSubmit={this.handleFormSubmit}>
                <Form.Row>
                    <Form.Group as={Col} controlId="form-hotspot-enddate">
                        <Form.Label>End Date</Form.Label>
                        <Form.Control required type="date" defaultValue={defaultDate} />
                    </Form.Group>

                    <Form.Group as={Col} controlId="form-hotspot-site">
                        <Form.Label>Filter Site</Form.Label>
                        <Form.Control type="text" placeholder="Eg. 'TNLTM' or empty to select all sites" />
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
}

export default Hotspot