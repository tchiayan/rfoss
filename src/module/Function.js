import React from 'react';
import { Modal } from 'react-bootstrap'
import { Button , Form , Message } from 'semantic-ui-react';
const pivot = (data, key, category, val, filter = [], keyFormat = null) => {
    // filter data 
    if(filter.length > 0){
        if(typeof category === 'string'){
            data = data.filter(row => filter.includes(row[category]))
        }else{
            data = data.filter(row => filter.includes(row['object']))
        }
    }

    const _key = typeof key === 'string' ? Array.from(new Set(data.map(row => row[key]))) : key
    const _cat = typeof category === 'string' ? Array.from(new Set(data.map(row => row[category]))) : category
    //console.log(_cat)
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
        if(typeof category === 'string'){
            const columnIndex = _cat.indexOf(data[i][category])
            if(rowIndex !== -1 && columnIndex !== -1){
                table[rowIndex+1][columnIndex+1] = table[rowIndex+1][columnIndex+1] !==null ? table[rowIndex+1][columnIndex+1]+data[i][val] : data[i][val]
            }
        }else{
            for(let j=0 ; j < _cat.length ;  j++){
                table[rowIndex+1][j+1] = table[rowIndex+1][j+1] !== null ? table[rowIndex+1][j+1]+data[i][_cat[j]] : data[i][_cat[j]]
            }
        }
    }
    return table
}

const chart = (datatable , charttitle , charttype = 'line' , formatting = {
        chartid:Math.random().toString('26').slice(2), 
        primaryAxisFormat:'general', 
        primaryAxisEvent: {}, 
        secondaryAxisFormat: 'general',
        secondaryAxisEvent: {},
        excelLineWidth: null
    }) => {
    //let chartid = Math.random().toString('26').slice(2)
    
    let chartType = typeof charttype !== 'string' ? {} : {type:charttype}
    let hasSecondary = typeof charttype === 'string' ? false : Object.values(charttype).find(({targetAxis}) => {
        return targetAxis !== undefined ? targetAxis === 1 : false
    })

    let yAxis = [{
        //id: 'primaryAxis',
        labels:{
          formatting: formatting.primaryAxisFormat, 
          events: formatting.primaryAxisEvent
        }
    }]
    if(hasSecondary){
      yAxis.push({
        //id: 'secondaryAxis',
        labels:{
          formatting: formatting.primaryAxisFormat, 
          events: formatting.primaryAxisEvent
        }, 
        opposite: true
      })
    }

    return {
        id: formatting.chartid ? formatting.chartid : Math.random().toString('26').slice(2),
        chart:{
            ...chartType,
            animation: false, 
            plotBackgroundColor: '#f5f5f5'
        }, 
        title:{
            text: charttitle
        }, 
        xAxis:{
            categories: datatable.slice(1).map(row => row[0])
        }, 
        yAxis:yAxis,
        series:datatable[0].slice(1).map((entity , i) => {
            let defaultSeries = {
              name: entity, 
              data:datatable.slice(1).map(row => row[i+1]),
              //formatter : function(){console.log(this)}
            }
    
            // extra excel props
            if(formatting.excelLineWidth !== null){ 
              defaultSeries['excelLineWidth'] = formatting.excelLineWidth
            }
    
            // axis
            if(typeof charttype !== 'string'){
              if(charttype[i] !== undefined){
                defaultSeries['type'] =  charttype[i]['type'] === undefined ? 'column' :  charttype[i]['type']
                defaultSeries['yAxis'] = charttype[i]['targetAxis'] === undefined ? 0 : charttype[i]['targetAxis']
              }
            }
            
            return defaultSeries
        }),
        credits: {
            enabled: false
        },
        tooltip: {
            crosshairs: {
                color: '#cccccc',
                dashStyle: 'solid'
            },
            shared: true
        },
        plotOptions:{
            series:{
                animation: false
            }
        }
    }
}

function ChartConfigModal(props){
    const { show , onHide , min, max , chartId, save, chartlist} = props;

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
    },[ min , max , show ])

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
                save(chartId , minValue , maxValue , chartlist)
                
                onHide()
            }}>Save</Button>
        </Modal.Footer>
    </Modal>
}

export {
    pivot,
    chart, 
    ChartConfigModal
}
