const sqlite3 = require('sqlite3').verbose();
const express = require('express')
const moment = require('moment')
const cors = require('cors')

const app = express()
app.use(express.json({limit:'500mb'}))
app.use(cors())
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(require("./steadcom-project-management-firebase-adminsdk-gnbmy-398e618260.json")),
    databaseURL: "https://steadcom-project-management.firebaseio.com" 
});

/**
 * Print verbose
 * @param {String} message 
 */
function printlog(message){
    console.log(`${new Date().toISOString()} - ${message}`)
}

/**
 * 
 * @param {SocketIO.Socket} socket 
 */

let totalConnection = 0
let connectionPath = process.env.DATABASE_PATH ? process.env.DATABASE_PATH : `${__dirname}\\digidatabase.db`

let db = new sqlite3.Database(connectionPath , (err) => {
    if(err){
        printlog(`Unable to connect to core database`)
    }else{
        printlog(`Connection to core database successfully`)
    }
})

io.on('connection', (socket) => {
    ++totalConnection;
    printlog(`User connected to server [Current active connection: ${totalConnection}]`)
    
    socket.on("sync", async (syncDate , table , token, userid) => {
        for(let i = 0 ; i < syncDate.length ; i++){
            /**
             * @var {Promise} query Return query data from database 
             */
            let query = new Promise((resolve, reject) => {
                admin.auth().verifyIdToken(token).then((decodedToken) => {
                    if(decodedToken.uid !== userid){
                        reject(new Error("Unauthorized access"))
                    }else{
                        db.all(`SELECT * FROM ${table} where date between '${syncDate[i]}' and '${moment(syncDate[i]).endOf('day').format("YYYY-MM-DD HH:mm:ss")}'`, (err , rows) => {
                            if(err){
                                printlog(`SQL query error: SELECT * FROM ${table} where date between '${syncDate[i]}' and '${moment(syncDate[i]).endOf('day').format("YYYY-MM-DD HH:mm:ss")}'`)
                                reject(new Error("Unable to get data from server"))
                            }else{
                                resolve(rows)
                            }
                        })
                    }
                })
            })

            await query.then((rows) => {
                socket.emit("syncdatasuccess" , {
                    status: 'ok', 
                    data: rows
                })
            }).catch((err) => {
                printlog(`Unable to query raw data from database [Table: ${table} ; Date: ${syncDate[i]}] `)
                socket.emit("syncdatafail", {
                    status: 'error',
                    detail: 'Unable to get data from server',
                    date: syncDate[i],
                    table: table
                })
            })
        }

        socket.emit("syncend")
    })

    socket.on('disconnect', () => {
        --totalConnection;
        printlog(`User disconnected from server [Current active connection: ${totalConnection}]`)
    })

    socket.on("update", (table , columns , values) => {
        db.exec(`INSERT INTO ${table} ( ${columns.join(" , ")}) VALUES ${values.join(" , ")}` , (err) => {
            if(err){
                printlog(`Update data from client failed [table: ${table} ; total length : ${values.length}]`)
                socket.emit("updateFail")
            }else{
                printlog(`Update data from client success [table: ${table} ; total length : ${values.length}]`)
                socket.emit("updateSuccess")
            }
        })
    })
})
app.on('exit', () => {
    printlog("Server is shutting down")
})

http.listen(8080, async ()=>{
    printlog(`Server is listening on port 8080`)
})