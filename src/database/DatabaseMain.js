import React from 'react'
import { Nav } from 'react-bootstrap';

import Column from './Column';
import Data from './Data';

import {
    Switch,
    Route,
    Link, 
    useRouteMatch,
    Redirect
} from "react-router-dom";

function DatabaseMain(props){
    let { title , setTitle} = props 

    React.useEffect(()=>{setTitle(title)},[title])
    let match  = useRouteMatch()

    return <>
        <Nav fill variant="tabs" defaultActiveKey="data">
            <Nav.Item>
                <Nav.Link as={Link} to={`${match.url}/data`} eventKey="data">Data</Nav.Link>
            </Nav.Item>
            <Nav.Item>
                <Nav.Link as={Link} to={`${match.url}/column`} eventKey="column">Columns</Nav.Link>
            </Nav.Item>
        </Nav>

        <Switch>
            <Route path={`${match.url}/column`}>
                <Column />
            </Route>
            <Route path={`${match.url}/data`}>
                <Data />
            </Route>
            <Route path={`${match.url}`}>
                <Redirect to={`${match.url}/data`} />
            </Route>
        </Switch>
    </>
}

export default DatabaseMain;