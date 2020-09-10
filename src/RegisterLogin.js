import React from 'react';
import { useHistory } from 'react-router-dom'

import { Card } from 'react-bootstrap';
import { Form , Button , Message} from 'semantic-ui-react';
import AppContext from './module/AppContext';
import { Database } from './Database';
import * as moment from 'moment';

import * as firebase from 'firebase/app';
import "firebase/database"

/**
 * Listen to device online/offline status.
 * Subscribe to realtime configuration upon online and unsubscribe the configuration once app goes offline.
 * Update the local storage variable once if any changes
 * 
 * @returns {Promise<Object|boolean>} 
 */
const updateRegisterListenWhenOnline = (  ) => {
    
    let appVersion = process.env.REACT_APP_VERSION.replace(/\./g, '`')
    let db = new Database()

    return new Promise((resolve) => {
        db.getComputerID().then((id)=>{
            let connectedRef = firebase.database().ref(".info/connected");
            console.log('Listen to online/offline')
            let licenseSubscription = null
            let configSubscription = null
            connectedRef.on("value", (snapshot)=>{
                if (snapshot.val() === true){
                    console.log('Application goes online')
                    licenseSubscription = firebase.database().ref(`rfoss/license/${id}`).on('value' , async (snapshot)=>{
                        if(!!snapshot){
                            if(snapshot.val() !== null){
                                const { email , project , expired , serverUpload } = snapshot.val()
                                window.localStorage.setItem("expired",expired)
                                window.localStorage.setItem("serverupload", serverUpload)
                                window.localStorage.setItem("project",project)
                                if(moment(expired, "YYYY-MM-DD").diff(moment(),'days') >= 0){
                                    window.localStorage.setItem("isExpired", false)
                                }else{
                                    window.localStorage.setItem("isExpired", true)
                                }
        
                                let _setting = {}
                                if(!!project){
                                    console.log(`Get lastest project setting [${project}] from online [rfoss/version/${appVersion}/projectSetting/${project}]`)
                                    _setting = await firebase.database().ref(`rfoss/version/${appVersion}/projectSetting/${project}`).once('value').then((snapshot)=>{
                                        if(snapshot.val()){
                                            let setting = {
                                                main: undefined,
                                                uploadingFormat: undefined, 
                                                useAliasColumn: undefined, 
                                                date: undefined, 
                                                object: undefined, 
                                                alias: undefined, 
                                                sitelevel: undefined, 
                                                celllevel: undefined, 
                                                sectorlevel: undefined,
                                                projectconfig: undefined,
                                                defaultsetting: undefined,
                                                databaseserver: undefined
                                            }
                                            Object.assign(setting , snapshot.val())
        
                                            Object.entries(setting).forEach(([field , value]) => {
                                                if(typeof value === 'object'){
                                                    window.localStorage.setItem(field , JSON.stringify(value))
                                                }else if(typeof value === 'undefined'){
                                                    window.localStorage.removeItem(field)
                                                }else{
                                                    window.localStorage.setItem(field , value)
                                                }
                                            })
        
                                            return setting
                                        }
                                    })
                                }
                                resolve({
                                    ..._setting,
                                    project: project,
                                    email: email, 
                                    expired: expired,
                                    serverupload: serverUpload
                                })
                            }else{
                                window.localStorage.removeItem("expired")
                                window.localStorage.removeItem("project")
                                window.localStorage.removeItem("isExpired")
                            }
                        }
                        
                    })
                }else{
                    // unsubscribe any online change event
                    if(licenseSubscription !== null){
                        licenseSubscription()
                    }
    
                    if(configSubscription !== null){
                        configSubscription()
                    }
    
                    console.log(`Application offline, get from offline`)
                    //callbackIfOffline()
                    resolve(false)
                }
            })
        })
    })
      
}

function RegisterLogin(props){
    const { title , setTitle} = props 
    const [ computerId, setComputerId ] = React.useState('')
    const [ email , setEmail ] = React.useState('')
    const [ registered , setRegistered ] = React.useState(false)
    const [ project , setProject ] = React.useState("")
    const [ expired , setExpired ] = React.useState(null)
    const [ isExpired , setIsExpired ] = React.useState(false)
    const appContext = React.useContext(AppContext)
    const history = useHistory();
    //const emailRef = React.useRef()

    React.useEffect(() => {
        let db = new Database()
        db.getComputerID().then((id)=>{
            setComputerId(id)

            if(appContext.licenseValid !== null && appContext.project !== null && appContext.expiredDate !== null){
                
                setProject(appContext.project)
                setExpired(appContext.expiredDate)

                if(moment(appContext.expiredDate, "YYYY-MM-DD").diff(moment(),'days') >= 0){
                    setIsExpired(false)
                    history.push("/database")
                }else{
                    setIsExpired(true)
                }
            } 

            if(appContext.email !== '' && appContext.email !== null){
                setEmail(appContext.email)
                setRegistered(true)
            }
        })
    }, [appContext.email , appContext.project , appContext.licenseValid, appContext.expiredDate])
    
    React.useEffect(()=>{
        setTitle(title)
    },[title])
    
    
    const registeredComputer = () => {
        if(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)){
            firebase.database().ref(`rfoss/license/${computerId}`).set({
                email:email, 
                register: new Date().toISOString(), 
            },(error)=>{
                if(error){

                }else{
                    setRegistered(true)
                    window.localStorage.setItem("email", email)
                }
            })
            
        }
    }

    return <div style={{display: 'flex', width: '100%', height:'calc( 100vh - 64px )', justifyContent:'center', alignItems: 'center'}}>
        <Card style={{width:'50%'}}>
            <Card.Body>
                <Form onSubmit={()=>{registeredComputer()}} >
                    <Form.Group widths="equal">
                        <Form.Input disabled={registered} label="Email address" type="email" value={email} onChange={(e,{value})=>setEmail(value)} required placeholder="Enter your email address" />
                    </Form.Group>
                    <Form.Group widths="equal">
                        <Form.Input label="ID" disabled value={computerId} />
                    </Form.Group>
                    {project !== "" && expired !== null && <Form.Group widths="equal">
                        <Form.Input type="text" label="Project" value={project} disabled/>
                        <Form.Input type="date" label="Expired" value={expired} disabled/>
                    </Form.Group>}
                    {registered && project === "" && expired === null && <Message info header={'License registered. Waiting admin approval'} />}
                    {!registered && <Button basic primary disabled={computerId === "" || email.trim() === ""}>Register</Button>}
                    {registered && isExpired && <Message info header={'License expired'} />} 
                </Form>
            </Card.Body>
        </Card>
    </div>
}

export { updateRegisterListenWhenOnline }
export default RegisterLogin