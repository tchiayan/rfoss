import React from 'react'
import 'semantic-ui-css/semantic.min.css'
import { Sidebar , Segment , Menu , Icon , Button} from 'semantic-ui-react';
import * as moment from 'moment';
import { Database } from './Database';

import DatabaseMain from './database/DatabaseMain';
import KPIList from './kpilist/KPIList';
import Reporting from './reporting/Reporting';
import RegisterLogin , { updateRegisterListenWhenOnline }from './RegisterLogin';
import { FreezeProvider , FreezeModal } from './module/FreezeView';
import {  ErrorModal , InfoModal , ToastProvider } from './module/ToastContext';
import { AppProvider } from './module/AppContext';

import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect
} from "react-router-dom";

function App(){

  const [ sidebarVisible , setSidebarVisible ] = React.useState(false)
  const [ title , setTitle ] = React.useState('Database')
  const [ freeze , setFreeze ] = React.useState(false)
  const [ freezeMessage , setFreezeMessage ] = React.useState("Loading...")
  const [ freezeProgress , setFreezeProgress ] = React.useState(null)
  const [ licenseValid , setLicenseValid ] = React.useState(null)
  const [ errorMessage , setErrorMessage ] = React.useState(null)
  const [ infoMessage , setInfoMessage ] = React.useState(null)
  const [ tables, setTables ] = React.useState([])
  const setFreezing = (show , message = "Loading..." , progress = null) => {
    setFreeze(show)
    setFreezeMessage(message)
    setFreezeProgress(progress)
  }

  const updateLicense = () => {
    let expired = localStorage.getItem('expired')
      if(expired !== null){
        if(moment(expired, "YYYY-MM-DD").diff(moment(),'days') >= 0){
          setLicenseValid(expired)
        }else{
          setLicenseValid(null)
        }
      }else{
        setLicenseValid(null)
      }
  }

  const updateTables = () => {
    let db = new Database()
    return db.query(`SELECT name FROM sqlite_master WHERE type='table' and name != 'sqlite_sequence'`).then((response)=>{
      if(response.status === 'Ok'){
        setTables(response.result.map(row => row.name))
        return response.result.map(row => row.name)
      }
    })
  }
  React.useEffect(()=>{
    // update license if application goes online
    updateRegisterListenWhenOnline(()=>{
      updateLicense()
    })

    // default read license from local
    updateLicense()

    // create main database if don't have and query all available table
    updateTables()
  },[])

  return <div style={{width:'100%',height:'100vh'}}>
    <AppProvider value={{tables:tables, updateTables:updateTables}}>
      <Router>
        <FreezeProvider value={{setFreeze:setFreezing}}>
          <FreezeModal hide={freeze} message={freezeMessage} value={freezeProgress}/>
          <Sidebar.Pushable  dimmed={true}>
            <Sidebar as={Menu} animation="overlay" direction="left" visible={sidebarVisible} vertical width='thin' inverted>
              <Menu.Item style={{height: '40px'}} onClick={()=>setSidebarVisible(false)}>
                <Icon name="angle left" />
              </Menu.Item>
              <Menu.Item as={Link} to="/database" onClick={()=>setSidebarVisible(false)}>
                Database
              </Menu.Item>
              <Menu.Item as={Link} to="/kpilist" onClick={()=>setSidebarVisible(false)}>
                KPI List
              </Menu.Item>
              <Menu.Item as={Link} to="/reporting" onClick={()=>setSidebarVisible(false)}>
                Reporting
              </Menu.Item>
            </Sidebar>
            <Sidebar.Pusher dimmed={sidebarVisible}>
              <ToastProvider value={{setError:setErrorMessage, setInfo:setInfoMessage}}>
                <ErrorModal open={errorMessage !== null} onClose={()=>setErrorMessage(null)} message={errorMessage}/>
                <InfoModal open={infoMessage !== null} onClose={()=>setInfoMessage(null)} message={infoMessage} />
                <Segment basic style={{padding: '7px'}}>
                  <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                    <div style={{padding: '7px', height:'32px', width:'32px', cursor: 'pointer', justifyContent:'center', alignItems: 'center'}} onClick={()=>setSidebarVisible(true)}>  
                      <Icon name="bars" />
                    </div>
                    <div style={{fontSize: '1.71428571rem' ,fontWeight: '700'}}>{title}</div>
                    <div style={{flexGrow: 1}}></div>
                    <div style={{padding:'0px 10px',fontStyle:'italic',color:'gray', display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
                      <div style={{fontSize:'0.95em'}}>{licenseValid === null ? 'License Invalid':'License Valid'}</div>
                      {licenseValid !== null &&<div style={{fontSize:'0.8em'}}>{`Expired on: ${licenseValid}`}</div>}
                    </div>
                  </div>
                  <div>
                    <Switch>
                      <AuthorizedRoute path="/database">
                        <DatabaseMain title={'Database'} setTitle={setTitle} />
                      </AuthorizedRoute>
                      <AuthorizedRoute path="/kpilist">
                        <KPIList title={'KPI'} setTitle={setTitle}/>
                      </AuthorizedRoute>
                      <AuthorizedRoute path="/reporting">
                        <Reporting title={'Reporting'} setTitle={setTitle} />
                      </AuthorizedRoute>
                      <Route path="/register">
                        <RegisterLogin title={'License'} setTitle={setTitle} />
                      </Route>
                      <Route path="/">
                        <Redirect to="/database" />
                      </Route>
                    </Switch>
                  </div>
                </Segment>
              </ToastProvider>
            </Sidebar.Pusher>
          </Sidebar.Pushable>
      
        </FreezeProvider>
        
      </Router>
    </AppProvider>
  </div>
}

function AuthorizedRoute({children , ...props}) {
  return (
    <Route 
      {...props}
      render = {({location}) => {
        let expired = window.localStorage.getItem('expired')
        let allow 
        if(expired){
          allow = moment(expired, "YYYY-MM-DD").diff(moment(),'days') >= 0
        }else{
          allow = false
        }

        return allow ? children : <Redirect to={{pathname:'/register',state:{from:location}}} />
      }}
    />
  )
}
export default App