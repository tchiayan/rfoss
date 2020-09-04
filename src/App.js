import React from 'react'
import 'semantic-ui-css/semantic.min.css'
import io from 'socket.io-client';
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

import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from './theme';
import { GlobalStyles } from './global';

import * as firebase from 'firebase/app';
import "firebase/auth";

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
  const [ email , setEmail ] = React.useState('')
  const [ licenseValid , setLicenseValid ] = React.useState(null)
  const [ expiredDate , setExpiredDate ] = React.useState(null)
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
  const [ projectConfig , setProjectConfig ] = React.useState(null)
  const [ defaultSetting , setDefaultSetting ] = React.useState(null)
  const [ appStatus , setAppStatus ] = React.useState('')
  const [ authenticated , setAuthenticated ] = React.useState(false)
  const [ databaseBusy , setDatabaseBusy ] = React.useState(false)

  const db = new Database()


  const setFreezing = (show , message = "Loading..." , progress = null) => {
    setFreeze(show)
    setFreezeMessage(message)
    setFreezeProgress(progress)
  }

  const updateLicenseFromLocal = () => {
    let expired = localStorage.getItem('expired')
      if(expired !== null){
        setExpiredDate(expired)
        if(moment(expired, "YYYY-MM-DD").diff(moment(),'days') >= 0){
          setLicenseValid(expired)
        }else{
          setLicenseValid(null)
        }
      }else{
        setLicenseValid(null)
        setExpiredDate(null)
      }
    
    let _project = localStorage.getItem("project")
    if(_project !== null){
      setProject(_project)
    }

    let _email = localStorage.getItem("email")
    if(_email !== null){
      setEmail(_email)
    }else{
      setEmail("")
    }
  }

  const updateAppContextFromLocal = () => {
    let main = localStorage.getItem('main')
    if(main !== null){
      let _main = JSON.parse(main)
      //console.log(main)
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

    let _projectConfig = localStorage.getItem('projectconfig')
    if(_projectConfig !== null){
      setProjectConfig(JSON.parse(_projectConfig))
    }

    let _defaultSetting = localStorage.getItem("defaultsetting")
    if(_defaultSetting !== null){
      setDefaultSetting(JSON.parse(_defaultSetting))
    }

    let _uploadingHeader = localStorage.getItem('uploadingHeader')
    let _useAliasColumn = localStorage.getItem('useAliasColumn')
    let _alias = localStorage.getItem('alias')

    let _object = localStorage.getItem("object")
    let _date = localStorage.getItem("date")
    if(_object !== null && _date !== null){
      setObjectDate({object:_object,date:_date})
    }

    setUploadingOptions({
      alias: (_alias === null || _alias === undefined) ? uploadingOptions.alias : JSON.parse(_alias),
      useAliasColumn: (_useAliasColumn === null || _useAliasColumn === undefined) ? uploadingOptions.useAliasColumn : JSON.parse(_useAliasColumn),
      uploadingHeader: (_uploadingHeader === null || _uploadingHeader === undefined) ? uploadingOptions.uploadingHeader : parseInt(_uploadingHeader)
    })
  }

  const updateTables = () => {
    return db.query(`SELECT name FROM sqlite_master WHERE type='table' and name != 'sqlite_sequence'`).then((response)=>{
      if(response.status === 'Ok'){
        setTables(response.result.map(row => row.name))
        return response.result.map(row => row.name)
      }
    })
  }
  
  // Authenticate with online server 
  React.useEffect(() => {
    if( !!email && !!project && !!expiredDate){
      if(moment(expiredDate, "YYYY-MM-DD").diff(moment(),'days') >= 0 ){
        if(firebase.auth().currentUser === null){
          firebase.auth().signInAnonymously().then(() => {
            setAppStatus('Authentication success')
            setAuthenticated(true)
          }).catch((err) => {
            setAppStatus('Authentication failed')
            setAuthenticated(false)
          })
        }else{
          // user is already sign in
          setAuthenticated(true)
        }
      }else{
        if(firebase.auth().currentUser !== null){
          firebase.auth().signOut()
          setAuthenticated(false)
        }
      }
    }else{
      if(firebase.auth().currentUser !== null){
        firebase.auth().signOut()
        setAuthenticated(false)
      }
    }
  } , [email , project , expiredDate])

  // Sync database from online
  const syncDatabase =  () => {
    console.log(`Check local database and sync with online database`)
    setDatabaseBusy(true)
    let currentUser = firebase.auth().currentUser
    currentUser.getIdToken().then(async (token) => {
      const checkRange = new Array(moment().diff(moment('2020-05-22'), 'days')).fill(0).map((val , ind) => moment('2020-05-22').startOf("days").add(ind , 'days').format('YYYY-MM-DD HH:mm:ss'))
      const socket = io('http://localhost:8080')
      for(let i  = 0 ; i < main.length ; i ++){
        let rangeDate = await db.query(`SELECT DISTINCT [date] as date FROM ${main[i]} WHERE date between '2020-05-22' and  '${moment().subtract(1 , "days").endOf("days")}' ORDER BY [date]`)
        if(rangeDate.status === 'Ok'){
          rangeDate = rangeDate.result.map(row => row.date)
          // Find missing date 
          let missingRange  = checkRange.filter(date => !rangeDate.includes(date))
          if(missingRange.length > 0){ // update missing range from online database
            //console.log(`Update ${main[i]} for range [${missingRange.join(" , ")}]`)
            let syncProgress = 0/missingRange.length
            setAppStatus(`Sync ${main[i]} [${(syncProgress*100).toFixed(0)}%]`)
            for(let j = 0 ; j < missingRange.length ; j++){
              let promise = new Promise((resolve) => {
                socket.on("syncdatafail", (data) => {
                  console.log(data)
                  socket.off("syncdatafail")
                  socket.off("syncdatasuccess")
                  resolve()
                })
      
                socket.on("syncdatasuccess", (data) => {
                  console.log(`Received new data from online database for ${main[i]} table for date ${missingRange[j]}. Data Count: ${data.data.length}`)
                  socket.off("syncdatasuccess")
                  socket.off("syncdatafail")
                  if(data.data.length > 0){
                    let columns = Object.keys(data.data[0]).filter(key => key !== 'ID')
                    let values = data.data.map(row => {
                      return ` ( ${columns.map(col => typeof row[col] === 'number' ? row[col] : `'${row[col]}'`).join(" , ")} ) `
                    })
                    db.update(`INSERT INTO ${main[i]} ( ${columns.join(" , ")} ) VALUES ${values.join(" , ")}`).then((response) => {
                      if(response.status === 'Ok'){
                        console.log(`Successfully update new data from online database into local ${main[i]} table for date ${missingRange[j]}. Data Count: ${data.data.length}`)
                      }else{
                        console.log(`Fail to update new data from online database into local ${main[i]} table for date ${missingRange[j]}. Data Count: ${data.data.length}`)
                      }

                      resolve()
                    })
                  }else{
                    resolve()
                  }
                })
                
                console.log(`Send request to get online data for ${main[i]} table for date ${missingRange[j]}.`)
                socket.emit("sync", [missingRange[j]] , main[i] , token, currentUser.uid)
              })
              syncProgress = (j+1)/missingRange.length;
              setAppStatus(`Sync ${main[i]} [${(syncProgress*100).toFixed(0)}%]`)
              await promise
            }
            
            
          }else{
            console.log(missingRange)
          }
          
          //console.log(checkRange)
        }
        
      }

      socket.disconnect()
      setAppStatus(`Sync done`)
      setDatabaseBusy(false)
    })
    
  }

  //let updateOnlineDatabaseInterval = null
  const [ updateOnlineDatabaseInterval , setUpdateOnlineDatabaseInterval ] = React.useState(null)
  React.useEffect(() => {
    if(!!expiredDate && !!project && authenticated){
      if(moment(expiredDate, "YYYY-MM-DD").diff(moment(),'days') >= 0 && main.length > 0){
        if(updateOnlineDatabaseInterval === null){
          setUpdateOnlineDatabaseInterval(setInterval(syncDatabase , 900000))
          syncDatabase();
        }else{
          console.log(`Skip set interval`)
        }
      }else if(updateOnlineDatabaseInterval !== null){
        console.log('clear interval due to license expired')
        clearInterval(updateOnlineDatabaseInterval)
        setUpdateOnlineDatabaseInterval(null)
        updateOnlineDatabaseInterval = null
      }
    }else if(updateOnlineDatabaseInterval !== null){
      console.log('clear interval due to setting incomplete / user is not authenticated')
      clearInterval(updateOnlineDatabaseInterval)
      setUpdateOnlineDatabaseInterval(null)
      updateOnlineDatabaseInterval = null
    }
  }, [project , expiredDate , main , updateOnlineDatabaseInterval, authenticated])

  React.useEffect(()=>{
    // update license if application goes online
    updateRegisterListenWhenOnline((setting)=>{
      console.log(`Sync license and project setting from online`)
      let { expired , project , email }  = setting
      if(expired !== null && expired !== undefined && email !== ''){
        setEmail(email)
        setExpiredDate(expired)
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

      

      let { main , uploadingFormat , sitelevel , celllevel , sectorlevel , uploadingHeader , useAliasColumn , alias , object , date, projectConfig , defaultsetting } = setting
      if( main !== null && main !== undefined){
        setSelectedTable(main.filter(table => tables.includes(table)).length > 0 ? main.filter(table => tables.includes(table))[0] : null)
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

      if(projectConfig !== null && projectConfig !== undefined){
        setProjectConfig(projectConfig)
      }

      if(defaultsetting !== null){
        setDefaultSetting(defaultsetting)
      }

      setUploadingOptions({
        alias: (alias === null || alias === undefined) ? uploadingOptions.alias : alias,
        useAliasColumn: (useAliasColumn === null || useAliasColumn === undefined) ? uploadingOptions.useAliasColumn : useAliasColumn,
        uploadingHeader: (uploadingHeader === null || uploadingHeader === undefined) ? uploadingOptions.uploadingHeader : parseInt(uploadingHeader)
      })
      
      
    }, () => {
      // Get latest config into app context 
      updateAppContextFromLocal()
    })

    // default read license from local
    updateLicenseFromLocal()

    
    
    // create main database if don't have and query all available table
    updateTables()

    // Listen to update
    db.listenAvailableUpdate().then(() => {
      // Prompt user to download or reject
      setUpdateAvaible(true)
    })

    db.listenUpdateDownloaded().then(() => {
      setUpdateDownloaded(true)
    })

  },[])

  return <ThemeProvider theme={lightTheme}>
    <GlobalStyles />
    <div style={{width:'100%',height:'100vh'}}>
      <AppProvider value={{
          tables:tables, 
          updateTables:updateTables , 
          promptTableSelection: (callback) => {
            setShowTableSelection({show:true, callback:callback})
          }, 
          selectedTable:selectedTable,
          setSelectedTable:setSelectedTable,
          main:main, 
          uploadingFormat:uploadingFormat, 
          uploadingOptions:uploadingOptions,
          project: project,
          objectDate:objectDate,
          sitelevel:sitelevel, 
          celllevel:celllevel,
          sectorlevel:sectorlevel, 
          theme: 'dark', 
          projectConfig: projectConfig, 
          licenseValid: licenseValid,
          expiredDate: expiredDate,
          project: project, 
          email: email, 
          defaultSetting: defaultSetting,
          setAppStatus: setAppStatus,
          databaseBusy: databaseBusy,
          setDatabaseBusy: setDatabaseBusy,
        }}>
        <Router>
          <FreezeProvider value={{setFreeze:setFreezing}}>
            <FreezeModal hide={freeze} message={freezeMessage} value={freezeProgress}/>
            <Sidebar.Pushable>
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
            <div style={{height: '18px', backgroundColor: '#ececec', display: 'flex', position: 'absolute' , bottom: '0px', width: '100vw', padding: '0px 10px'}}>
              <div style={{flexGrow: 1}}></div>
              <div style={{fontSize: '0.8em', color: 'gray'}}>
                {appStatus}
              </div>
            </div>
            
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
  </ThemeProvider>
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