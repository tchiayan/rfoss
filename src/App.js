import React from 'react'
import 'semantic-ui-css/semantic.min.css'
import { Sidebar , Segment , Menu , Icon , Button, Form, Radio} from 'semantic-ui-react';
import { Modal } from 'react-bootstrap'
import * as moment from 'moment';
import { Database } from './Database';
import { Snackbar , IconButton , Button as MaterialButton } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';

import DatabaseMain from './database/DatabaseMain';
import KPIList from './kpilist/KPIList';
import Reporting from './reporting/Reporting';
import AntennaSwap from './reporting/AntennaSwap';
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
  const [ main , setMain ] = React.useState([])
  const [ uploadingFormat , setUploadingFormat ] = React.useState('excel')
  const [ uploadingOptions , setUploadingOptions ] = React.useState({
    uploadingHeader: 1, 
    useAliasColumn: false, 
    alias: []
  })
  const [ objectDate , setObjectDate ] = React.useState({object:'object',date:'date'})
  const [ sitelevel , setSitelevel ] = React.useState(null)
  const [ celllevel , setCelllevel ] = React.useState(null)
  const [ sectorlevel , setSectorlevel ] = React.useState(null)
  const [ updateAvaible , setUpdateAvaible ] = React.useState(false)
  const [ updateDownloaded , setUpdateDownloaded ] = React.useState(false)
  const [ selectedTable , setSelectedTable ] = React.useState(null)
  const [ showTableSelection , setShowTableSelection ] = React.useState({show:false,callback:null})
  const [ project , setProject ] = React.useState(null)

  const setFreezing = (show , message = "Loading..." , progress = null) => {
    setFreeze(show)
    setFreezeMessage(message)
    setFreezeProgress(progress)
  }

  const updateLicenseFromLocal = () => {
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
    
    let _project = localStorage.getItem("project")
    if(_project !== null){
      setProject(_project)
    }
  }

  const updateAppContextFromLocal = () => {
    let main = localStorage.getItem('main')
    if(main !== null){
      let _main = JSON.parse(main)
      //console.log(main)
      console.log(tables)
      console.log(`Set default selected data table [${_main.filter(table => tables.includes(table)).length > 0 ? _main.filter(table => tables.includes(table))[0] : null}]`)
      setSelectedTable(_main.filter(table => tables.includes(table)).length > 0 ? _main.filter(table => tables.includes(table))[0] : null)
      
      setMain(_main)
    }

    let _uploadingFormat = localStorage.getItem('uploadingFormat')
    if(_uploadingFormat !== null){
      setUploadingFormat(_uploadingFormat)
    }

    let _sitelevel = localStorage.getItem('sitelevel')
    if(_sitelevel !== null){
      setSitelevel(_sitelevel)
    }

    let _celllevel = localStorage.getItem('celllevel')
    if(_celllevel !== null){
      setCelllevel(_celllevel)
    }

    let _sectorlevel = localStorage.getItem('sectorlevel')
    if(_sectorlevel !== null){
      setSectorlevel(_sectorlevel)
    }

    let _uploadingHeader = localStorage.getItem('uploadingHeader')
    let _useAliasColumn = localStorage.getItem('useAliasColumn')
    let _alias = localStorage.getItem('alias')

    let _object = localStorage.getItem("object")
    let _date = localStorage.getItem("date")
    if(_object !== null && _date !== null){
      setObjectDate({object:_object,date:_date})
    }

    console.log(_alias === undefined)
    setUploadingOptions({
      alias: (_alias === null || _alias === undefined) ? uploadingOptions.alias : JSON.parse(_alias),
      useAliasColumn: (_useAliasColumn === null || _useAliasColumn === undefined) ? uploadingOptions.useAliasColumn : JSON.parse(_useAliasColumn),
      uploadingHeader: (_uploadingHeader === null || _uploadingHeader === undefined) ? uploadingOptions.uploadingHeader : parseInt(_uploadingHeader)
    })

    
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
    updateRegisterListenWhenOnline((setting)=>{
      console.log(`Sync license and project setting from online`)
      console.log(setting)
      let { expired , project }  = setting
      if(expired !== null && expired !== undefined){
        if(moment(expired, "YYYY-MM-DD").diff(moment(),'days') >= 0){
          setLicenseValid(expired)
        }else{
          setLicenseValid(null)
        }
      }else{
        setLicenseValid(null)
      }

      if(project !== null && project !== undefined){
        setProject(project)
      }

      let { main , uploadingFormat , sitelevel , celllevel , sectorlevel , uploadingHeader , useAliasColumn , alias , object , date } = setting
      console.log(main)
      if( main !== null && main !== undefined){
        setSelectedTable(main.filter(table => tables.includes(table)).length > 0 ? main.filter(table => tables.includes(table))[0] : null)
        console.log(`Update main to ${main.join(" , ")}`)
        setMain(main)
      }

      if(uploadingFormat !== null && uploadingFormat !== undefined){
        setUploadingFormat(uploadingFormat)
      }

      if(sitelevel !== null){
        setSitelevel(sitelevel)
      }

      if(celllevel !== null){
        setCelllevel(celllevel)
      }

      if(sectorlevel !== null){
        setSectorlevel(sectorlevel)
      }


      if(object !== null && date !== null && object !== undefined && date !== undefined){
        setObjectDate({object:object,date:date})
      }

      setUploadingOptions({
        alias: (alias === null || alias === undefined) ? uploadingOptions.alias : alias,
        useAliasColumn: (useAliasColumn === null || useAliasColumn === undefined) ? uploadingOptions.useAliasColumn : useAliasColumn,
        uploadingHeader: (uploadingHeader === null || uploadingHeader === undefined) ? uploadingOptions.uploadingHeader : parseInt(uploadingHeader)
      })
      
    })

    // default read license from local
    updateLicenseFromLocal()

    // Get latest config into app context 
    updateAppContextFromLocal()
    
    // create main database if don't have and query all available table
    updateTables()

    // Listen to update
    let db = new Database()
    db.listenAvailableUpdate().then(() => {
      // Prompt user to download or reject
      setUpdateAvaible(true)
    })

    db.listenUpdateDownloaded().then(() => {
      setUpdateDownloaded(true)
    })

  },[])

  return <div style={{width:'100%',height:'100vh'}}>
    <AppProvider value={{
        tables:tables, 
        updateTables:updateTables , 
        promptTableSelection: (callback) => {
          setShowTableSelection({show:true, callback:callback})
        }, 
        selectedTable:selectedTable,
        setSelectedTable:setSelectedTable,
        //showTableSelection: showTableSelection, 
        main:main, 
        uploadingFormat:uploadingFormat, 
        uploadingOptions:uploadingOptions,
        project: project,
        objectDate:objectDate,
        sitelevel:sitelevel, 
        celllevel:celllevel,
        sectorlevel:sectorlevel
      }}>
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
              {tables.includes("formulas") && <Menu.Item as={Link} to="/kpilist" onClick={()=>setSidebarVisible(false)}>
                KPI List
              </Menu.Item>}
              {tables.includes("formulas") && <Menu.Item as={Link} to="/reporting" onClick={()=>setSidebarVisible(false)}>
                Reporting
              </Menu.Item>}
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
                        {project === 'huaweimaxis' && <Reporting title={'Reporting'} setTitle={setTitle} />}
                        {project === 'ztedigi' && <AntennaSwap title={'Reporting'} setTitle={setTitle} />}
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
          <MainSelection show={showTableSelection.show} closed={showTableSelection.callback} onHide={()=>{setShowTableSelection({show:false,callback:null})}} tables={main.filter(table => tables.includes(table))} selected={selectedTable} onSelectionChange={(table)=>setSelectedTable(table)}/>
        
          <Snackbar 
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
            open={updateAvaible}
            onClose={()=>setUpdateAvaible(false)}
            message="Update available"
            action={
              <>
                <MaterialButton color="primary" size="small" onClick={()=>{
                  // Send download Update
                  let db = new Database()
                  db.downloadUpdate()
                  setUpdateAvaible(false)
                }}>Download</MaterialButton>
                <IconButton size="small" aria-label="close" color="inherit" onClick={()=>setUpdateAvaible(false)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            }
          />

          <Snackbar 
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
            open={updateDownloaded}
            onClose={()=>setUpdateDownloaded(false)}
            message="Update downloaded"
            action={
              <>
                <MaterialButton color="primary" size="small" onClick={()=>{
                  // Send download Update
                  let db = new Database()
                  db.quitAndInstall()
                  setUpdateDownloaded(false)
                }}>Quit & Install</MaterialButton>
                <IconButton size="small" aria-label="close" color="inherit" onClick={()=>setUpdateDownloaded(false)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            }
          />
          
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

function MainSelection(props){
  const { show , onHide , closed , tables , selected , onSelectionChange, close} = props 

  React.useEffect(()=>{
    if(show && tables.length === 1) { // If only one table to select, directly return that result
      onHide()
      closed(tables[0])
    }
  }, [show])
  return <Modal show={show} onHide={onHide} centered size="sm" backdrop="static">
    <Modal.Header><h4>Select table</h4></Modal.Header>
    <Modal.Body>
      <Form>
        {tables.map((table, tableId)=> {
          return <Form.Field control={Radio} label={table} key={tableId} value={table} checked={table === selected} onChange={(e,{value})=>onSelectionChange(value)}/>
        })}
      </Form>
    </Modal.Body>
    <Modal.Footer>
      <Button primary onClick={()=>{onHide(); if(closed !== null){closed(selected)}}}>Select</Button>
    </Modal.Footer>
  </Modal>
}
export default App