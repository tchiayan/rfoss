import React from 'react';

import { Card } from 'react-bootstrap';
import { Form , Button , Message} from 'semantic-ui-react';
import { Database } from './Database';
import * as moment from 'moment';

import * as firebase from 'firebase/app';
import "firebase/database"

const updateRegisterListenWhenOnline = ( callback ) => {
    let db = new Database()
    db.getComputerID().then((id)=>{
        let connectedRef = firebase.database().ref(".info/connected");
        console.log('Listen to online/offline')
        connectedRef.on("value", (snapshot)=>{
            if (snapshot.val() === true){
                console.log('Application go online')
                firebase.database().ref(`license/${id}`).once('value').then((snapshot)=>{
                    if(snapshot.val() !== null){
                        console.log('Update local license')
                        const { email , project , expired } = snapshot.val()
                        window.localStorage.setItem("expired",expired)
                        window.localStorage.setItem("project",project)
                        if(moment(expired, "YYYY-MM-DD").diff(moment(),'days') >= 0){
                            window.localStorage.setItem("isExpired", false)
                        }else{
                            window.localStorage.setItem("isExpired", true)
                        }
                        callback()
                    }else{
                        window.localStorage.removeItem("expired")
                        window.localStorage.removeItem("project")
                        window.localStorage.removeItem("isExpired")
                    }
                })
            }
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
    //const emailRef = React.useRef()

    React.useEffect(()=>{setTitle(title)},[title])
    React.useEffect(()=>{
        let db = new Database()
        db.getComputerID().then((id)=>{
            setComputerId(id)

            let connectedRef = firebase.database().ref(".info/connected");
            connectedRef.on("value", (snapshot)=>{
                if (snapshot.val() === true){
                    firebase.database().ref(`license/${id}`).once('value').then((snapshot)=>{
                        //console.log(snapshot.val())
        
                        if(snapshot.val() === null){
                            setRegistered(false)
                        }else{
                            const { email , project , expired } = snapshot.val()
                            setEmail(email)
                            setRegistered(true)
                            if(project){
                                setProject(project)
                            }
        
                            if(expired){
                                setExpired(expired)
                            }
        
                            window.localStorage.setItem("expired",expired)
                            window.localStorage.setItem("project",project)
        
                            if(moment(expired, "YYYY-MM-DD").diff(moment(),'days') >= 0){
                                window.localStorage.setItem("isExpired", false)
                                setIsExpired(false)
                            }else{
                                window.localStorage.setItem("isExpired", true)
                                setIsExpired(true)
                            }
                        }
                    })
                } else {
                    //console.log("user is offline")
                    let expired = window.localStorage.getItem("expired")
                    let project = window.localStorage.getItem("project")
                    let email = window.localStorage.getItem("email")
                    
                    if(email !== null) {setEmail(email);setRegistered(true)}
                    if(project !== null) setProject(project)
                    if(expired !== null) setExpired(expired)

                    if(moment(expired, "YYYY-MM-DD").diff(moment(),'days') >= 0){
                        window.localStorage.setItem("isExpired", false)
                        setIsExpired(false)
                    }else{
                        window.localStorage.setItem("isExpired", true)
                        setIsExpired(true)
                    }
                }
            })
        })
    },[])

    const registeredComputer = () => {
        if(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)){
            firebase.database().ref(`license/${computerId}`).set({
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