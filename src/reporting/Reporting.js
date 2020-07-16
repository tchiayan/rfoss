import React from 'react'
import { Nav } from 'react-bootstrap';
import { Form , Button, Segment , Header , Icon } from 'semantic-ui-react';
import { Database } from '../Database';

import * as moment from 'moment';
import {
    Switch,
    Route,
    Link, 
    useRouteMatch,
    useHistory
} from "react-router-dom";

import BhLayer from './BhLayer';
import BhMain from './BhMain';
import BiSector from './BiSector';
import Ta from './Ta';

function Reporting(props){
    let { title , setTitle} = props 
    
    let match  = useRouteMatch()
    let [ startDate , setStartDate ] = React.useState(moment(new Date()).startOf('days').subtract(14,'days').format("YYYY-MM-DD")) //React.useState(moment(new Date()).startOf('days').subtract(15, 'days').format('YYYY-MM-DD'))
    let [ endDate , setEndDate ] = React.useState(moment(new Date()).startOf('days').subtract(1, 'days').format('YYYY-MM-DD'))
    let [ sites , setSites ] = React.useState('sedu')
    let [ querying , setQuerying ] = React.useState(false)
    let [ refreshing , setRefreshing ] = React.useState(false)
    let history = useHistory()
    const dependancy = [ 'bhlayer', 'bhmain', 'bisector', 'tatable2', 'tagraph2']
    const [ dependancyTest , setDependancyTest ] = React.useState(false)

    React.useEffect(()=>{setTitle(title)},[title])
    React.useEffect(()=>{
        
        (async ()=> {   
            let db = new Database()
            let hasAllDatabase = false
            for(let i =0 ,table; table = dependancy[i]; i++){
                let hasTable = await db.tableExist(table).then((response) => {
                    return response
                }).catch((error)=>{
                    console.log(error.message)
                })
                if(!hasTable){
                    setDependancyTest(false)
                    hasAllDatabase = false
                    history.push(`${match.url}/error`)
                    break;
                }else{
                    hasAllDatabase = true
                }
            }
            if(hasAllDatabase){
                history.push(`${match.url}/bhlayer`)
                setDependancyTest(true)
            }
        })()
        
    },[])

    return <>
        <Nav fill variant="tabs" defaultActiveKey="bhlayer">
            <Nav.Item>
                <Nav.Link disabled={!dependancyTest} as={Link} to={`${match.url}/bhlayer`} eventKey="bhlayer">BH Layer Graph</Nav.Link>
            </Nav.Item>
            <Nav.Item>
                <Nav.Link disabled={!dependancyTest} as={Link} to={`${match.url}/bhmain`} eventKey="bhmain">BH Main Graph</Nav.Link>
            </Nav.Item>
            <Nav.Item>
                <Nav.Link disabled={!dependancyTest} as={Link} to={`${match.url}/bisector`} eventKey="bisector">BiSector Graph</Nav.Link>
            </Nav.Item>
            <Nav.Item>
                <Nav.Link disabled={!dependancyTest} as={Link} to={`${match.url}/ta`} eventKey="ta">TA</Nav.Link>
            </Nav.Item>
        </Nav>
        <div style={{height: 'calc( 100vh - 180px )', position:'relative'}}>
            <Switch>
                <Route path={`${match.url}/bhlayer`}>
                    <BhLayer 
                        sites={sites} 
                        startDate={startDate} 
                        endDate={endDate} 
                        setQuerying={(query)=>setQuerying(query)}
                        querying={querying}
                        refreshing={refreshing}
                        onDoneRefreshing={()=>setRefreshing(false)}
                    />
                </Route>
                <Route path={`${match.url}/bhmain`}>
                    <BhMain 
                        sites={sites} 
                        startDate={startDate} 
                        endDate={endDate} 
                        setQuerying={(query)=>setQuerying(query)}
                        querying={querying}
                        refreshing={refreshing}
                        onDoneRefreshing={()=>setRefreshing(false)}
                    />
                </Route>
                <Route path={`${match.url}/bisector`}>
                    <BiSector 
                        sites={sites} 
                        startDate={startDate} 
                        endDate={endDate} 
                        setQuerying={(query)=>setQuerying(query)}
                        querying={querying}
                        refreshing={refreshing}
                        onDoneRefreshing={()=>setRefreshing(false)}
                    />
                </Route>
                <Route path={`${match.url}/ta`}>
                    <Ta 
                        sites={sites} 
                        startDate={startDate} 
                        endDate={endDate} 
                        setQuerying={(query)=>setQuerying(query)}
                        querying={querying}
                        refreshing={refreshing}
                        onDoneRefreshing={()=>setRefreshing(false)}
                    />
                </Route>
                <Route path={`${match.url}/error`}>
                    <Segment placeholder  style={{height: 'calc( 100vh - 216px )', margin: '10px 0px'}}>
                        
                        <Header icon>
                            Error to load the setting. Consider to reset all chart & table setting
                            <Button secondary style={{marginTop: '10px'}} onClick={()=>history.push('/database/data')}>Go to reset</Button>
                        </Header>
                    </Segment>
                </Route>
                <Route path={`${match.url}`}>
                    <Segment placeholder  style={{height: 'calc( 100vh - 216px )', margin: '10px 0px'}}>
                        <Header icon>
                            Loading...
                        </Header>
                    </Segment>
                </Route>
            </Switch>

        </div>
        
        <div style={{display: 'flex', alignItems: 'center'}}>
            <Form style={{flexGrow:1}}>
                <Form.Group widths="equal">
                    <Form.Input size="small" type='date' label="Start date" max={endDate} defaultValue={startDate} onBlur={(e)=>setStartDate(e.target.value)} onKeyUp={(e)=>{
                        if(e.keyCode === 13){
                            e.target.blur()
                            setRefreshing(true)
                        }
                    }}/>
                    <Form.Input size="small" type='date' label="End date" min={startDate} defaultValue={endDate} onBlur={(e)=>setEndDate(e.target.value)} onKeyUp={(e)=>{
                        if(e.keyCode === 13){
                            e.target.blur()
                            setRefreshing(true)
                        }
                    }}/>
                    <Form.Input defaultValue={localStorage.getItem("historySite") !== null ? localStorage.getItem("historySite") : sites} size="small" type='text' label="Site" placeholder="Enter sites/cell" onBlur={(e)=>{setSites(e.target.value);localStorage.setItem("historySite",e.target.value)}} onKeyUp={(e)=>{
                        if(e.keyCode === 13){
                            e.target.blur()
                            setRefreshing(true)
                        }
                    }}/> 
                </Form.Group>
            </Form>
            <div style={{marginLeft: '10px'}}><Button disabled={querying} onClick={()=>{setRefreshing(true);console.log(`set refreshing true`)}}>Refresh</Button></div>
        </div>
    </>
}

function CheckRequiredDatabase(){
    
}

export default Reporting