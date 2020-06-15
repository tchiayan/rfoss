import Highcharts from "highcharts";
import React from "react";

import { Modal, Form, Button } from "react-bootstrap";

class Chart extends React.Component{
    constructor(props){
        super(props)
        this.ref = React.createRef()
        this.chart = null
        this.state = {
            chartSettingDialog: false, 
            min: 0,
            max: 0,
            labelIndex: 0,
        }

        this.handleChartSettingDialogClose = this.handleChartSettingDialogClose.bind(this)
        this.handleMinMaxChanged = this.handleMinMaxChanged.bind(this)
    }

    convertTableToHighChartOption(){
        let chartOption = {
            chart: {type: 'line'},
            xAxis: {
                categories: this.props.table.slice(1).map(row => row[0])
            },
            series: this.props.table[0].slice(1).map((entity , i) =>{
                return {name: entity, data:this.props.table.slice(1).map(row => row[i+1])}
            })
        }

        if(this.props.title){
            chartOption['title'] = {
                text: this.props.title
            }
        }
        return chartOption
    }

    componentDidMount(){
        if(this.props.options){
            this.chart = Highcharts.chart(this.ref.current, this.props.options)
        }else if(this.props.table){
            if(this.props.table.length > 0){
                let options = this.convertTableToHighChartOption()
                this.chart = Highcharts.chart(this.ref.current, options)
            }
        }
        
        // Bind click event to yAxis Label to change axis min & max
        if(this.chart){
            for(var i=0;i<this.chart.yAxis.length;i++){
                let labelIndex = i 
                let svgElement = this.chart.yAxis[labelIndex].labelGroup.element;
                svgElement.style.cursor = "pointer";
                svgElement.addEventListener('click',()=>{
                    let min = this.chart.yAxis[labelIndex].min;
                    let max = this.chart.yAxis[labelIndex].max;
                    this.setState({chartSettingDialog:true, min: min, max: max, labelIndex: labelIndex})
                })
            }
        }
    }

    handleChartSettingDialogClose(){
        this.setState({chartSettingDialog: false})
    }

    handleMinMaxChanged(event){
        event.preventDefault();
        event.stopPropagation();

        this.handleChartSettingDialogClose() // close the dialog

        const {
            labelIndex
        } = this.state 

        const form = event.currentTarget;
        const min = parseFloat(form.querySelector("#form-yaxis-min").value)
        const max = parseFloat(form.querySelector("#form-yaxis-max").value)

        if( !isNaN(min) && !isNaN(max) ){
            //console.log(this.chart.yAxis)
            //console.log(labelIndex)
            this.chart.yAxis[labelIndex].setExtremes(min, max)
        }
    }

    render(){
        

        const {
            style, 
            options, 
            table
        } = this.props

        const {
            min,
            max, 
        } = this.state

        if(this.chart){
            if(options){
                this.chart.update(options, true, true)
            }else if(table){
                if(table.length > 0){
                    let options = this.convertTableToHighChartOption()
                    this.chart = Highcharts.chart(this.ref.current, options)
                }
            }
        }

        return <div>
            <div ref={this.ref} style={style}></div>
            <Modal centered size="lg" show={this.state.chartSettingDialog} onHide={this.handleChartSettingDialogClose}>
                <Modal.Header>
                    Edit Scale
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={this.handleMinMaxChanged}>
                        <Form.Row>
                            <Form.Group controlId="form-yaxis-min">
                                <Form.Label>Min</Form.Label>
                                <Form.Control required type="text" defaultValue={min} />
                            </Form.Group>
                        </Form.Row>
                        <Form.Row>
                            <Form.Group controlId="form-yaxis-max">
                                <Form.Label>Max</Form.Label>
                                <Form.Control required type="text" defaultValue={max} />
                            </Form.Group>
                        </Form.Row>
                        <Button type="submit">Confirm</Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    }
}

export default Chart;