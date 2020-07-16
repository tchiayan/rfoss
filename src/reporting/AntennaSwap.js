import React from 'react'

import { Nav } from 'react-bootstrap';
import { Form , Button, Segment , Header , Icon } from 'semantic-ui-react';
import AppContext from '../module/AppContext';

import {
    Switch,
    Route,
    Link, 
    useRouteMatch,
    useHistory
} from "react-router-dom";

import KPIChart from './KpiChart';
import TaChart from './TaChart';

const dependancyTable = [
    'antennaswap2g', 
    'antennaswap3g', 
    'antennaswap4g',
    'antennaswapblended',
    'antennaswapblendeddata'
    //'ta2gchart',
    //'ta3gchart',
    //'ta4gchart',
]
function AntennaSwap(props){
    const { title , setTitle } = props 
    React.useEffect(()=>{
        setTitle(title)
    },[title])

    const match  = useRouteMatch()
    const history = useHistory()
    const appContext = React.useContext(AppContext)

    React.useEffect(()=>{
        if(dependancyTable.filter(table => !appContext.tables.includes(table)).length > 0){
            history.push(`${match.url}/error`)
        }else{
            history.push(`${match.url}/kpichart`)
        }
    }, [appContext.tables])

    return (<>
        <Nav fill variant="tabs" defaultActiveKey="kpichart">
            <Nav.Item>
                <Nav.Link as={Link} to={`${match.url}/kpichart`} eventKey="kpichart">KPI Chart</Nav.Link>
            </Nav.Item>
            {/*<Nav.Item>
                <Nav.Link as={Link} to={`${match.url}/tachart`} eventKey="tachart">TA Chart</Nav.Link>
            </Nav.Item>*/}
        </Nav>

        <Switch>
            <Route path={`${match.url}/kpichart`}>
                <KPIChart />
            </Route>
            {/*<Route path={`${match.url}/tachart`}>
                <TaChart />
            </Route>*/}
            <Route path={`${match.url}/error`}>
                <Segment placeholder  style={{height: 'calc( 100vh - 117px )', margin: '10px 0px'}}>
                    <Header icon>
                        Error to load the setting. Consider to reset all chart & table setting
                        <Button secondary style={{marginTop: '10px'}} onClick={()=>history.push('/database/data')}>Go to reset</Button>
                    </Header>
                </Segment>
            </Route>
            <Route path={`${match.url}`}>
                <Segment placeholder  style={{height: 'calc( 100vh - 117px )', margin: '10px 0px'}}>
                    <Header icon>
                        Loading...
                    </Header>
                </Segment>
            </Route>
        </Switch>
    </>)
}

export default AntennaSwap