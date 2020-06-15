const isDev = require('electron-is-dev')
const path = require('path')
const { ipcMain , dialog , app , Menu , BrowserWindow , electron } = require('electron')
const sqlite3 = require('sqlite3').verbose();
const { autoUpdater } = require("electron-updater");
const express = require('express')
const machineId = require('node-machine-id').machineId

let mainWindow
let spawnProcess = []
Menu.setApplicationMenu(null);

/* Checking App Version */
console.log("App version", app.getVersion())

/* Load configuration */
const fs = require("fs")
const configFilePath = "./config.js"
let defaultDbPath = path.join(process.cwd(),"database.db")
let configuration; 

if(fs.existsSync(configFilePath)){
    configuration = JSON.parse(fs.readFileSync(configFilePath, {encoding:"utf-8"}))
    defaultDbPath = configuration.dbPath
}else{
    // Create config file
    configuration = {dbPath:defaultDbPath}
    fs.writeFileSync(configFilePath, JSON.stringify(configuration), {encoding:'utf-8'})
    // defaultDbPath = "./core.db"
}

/* Electron */
function runApp(){
    if(!isDev){
        console.log('start server')
        const _app = express()
        const _port = 5151

        _app.use("/",express.static(`${path.join(__dirname, '../build/')}`))

        _app.get('/', (req,res)=>{
            res.sendFile('index.html',{'root':`${path.join(__dirname, '../build/')}`})
        })

        _app.listen(_port, ()=>{
            console.log(`resources serve on port ${_port}`)
            createWindow()
        })
    }else{
        console.log('development detected. load from localhost:3000')
        createWindow()
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({ 
        width: 950, 
        height: 700 , 
        webPreferences: {
            nodeIntegration: true
        },
        minWidth: 800,
        minHeight: 600,
    })

    // `file://${path.join(__dirname, '../build/index.html')}`
    mainWindow.loadURL(
        isDev ? 'http://localhost:3000' : 'http://localhost:5151/',
    )

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    
    mainWindow.removeMenu()
    mainWindow.setMenu(null)

    mainWindow.webContents.openDevTools({mode:'bottom'})
    autoUpdater.autoDownload = false
    autoUpdater.checkForUpdatesAndNotify();

    //Testing for update
    //setTimeout(()=>{
    //    console.log("update_available")
    //    mainWindow.webContents.send("update-available") 
    //},4000)

}

app.on('ready', runApp)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})

app.on('window-all-closed',()=>{
    // kill all spawn process upon user close the application
    if(spawnProcess.length > 0 ){
        spawnProcess.forEach(child => {
            child.kill()
        })
    }
})

ipcMain.on('excel', (event, arg)=>{
    const { spawn } = require("child_process")
    const script = isDev ?  `${__dirname}\\..\\python\\excel.py` : `${__dirname}/../../app.asar.unpacked/excel.exe`
    const scriptArgv = []
    console.log("Run command: " , script, scriptArgv.join(" "))
    let process = isDev ? spawn('python' , [script]) : spawn(script, scriptArgv)

    
    let dataString = ""
    /*Here we are saying that every time our node application receives data from the python process output stream(on 'data'), we want to convert that received data into a string and append it to the overall dataString.*/
    process.stdout.on('data', function(data){
        dataString += data.toString();
    });
    
    /*Once the stream is done (on 'end') we want to simply log the received data to the console.*/
    process.stdout.on('end', function(){
        console.log(dataString);
    });

    process.stderr.on('data', (data)=>{
        dataString += data.toString();
    })
    process.stderr.on('end', function(){
        console.log(dataString);
    });

    console.log('Input data into excel application')
    process.stdin.write(JSON.stringify(arg.steps))
    process.stdin.end();

    
    process.on("close",(code,signal)=>{
        console.log("Command return signal", code, signal)
        if(code==0){
            //trigger complete ack to renderer
            console.log("excel run successfully")
            event.sender.send(`excel_${arg.session}`, {status:'Ok', data: dataString})
        }else{
            // prompt error
            //const errorDialog = require('electron').dialog
            console.log("excel run with error")
            console.log(dataString)
            event.sender.send(`excel_${arg.session}`, {status:'Error',error:dataString})
        }
    })
})

ipcMain.on('uploadFileStatus', (event, arg) => {
    dialog.showOpenDialog({
        properties: ['openFile']
    }).then((dialogResult)=>{
        if(!dialogResult.canceled){
            let filePaths = dialogResult.filePaths;
            
            const { spawn } = require("child_process")
            const script = isDev ?  `${__dirname}\\..\\python\\upload.py` : `${__dirname}/../../app.asar.unpacked/upload.exe`
            //const script = isDev ?  `${__dirname}/upload.exe` : `${__dirname}/../../app.asar.unpacked/upload.exe`
            const scriptArgv = ['upload', defaultDbPath ,arg.tablename, filePaths[0]]
            
            event.sender.send('uploadFileStatus_'+arg.session+'_start')
            console.log("Run command: " , script, scriptArgv.join(" "))
            let process = isDev ? spawn('python', [script , ...scriptArgv]) : spawn(script, scriptArgv)
            spawnProcess.push(process)

            let bufferData = ""

            process.stdout.on("data",(data)=>{
                //console.log(data.toString())
                let lastIndexOf = data.toString().lastIndexOf("}")
                let readData = (bufferData + data.toString().slice(0,lastIndexOf+1)).match(/{.*?}/g)
                if(readData){
                    let data_json = JSON.parse(readData[readData.length - 1])
                    event.sender.send('uploadFileStatus_'+arg.session+'_counter', data_json)
                }
                bufferData = data.toString().slice(lastIndexOf+1)
            })

            let errorBuffer = ""
            process.stderr.on('data', (data)=>{
                errorBuffer += data.toString();
            })
            process.stderr.on('end', function(){
                console.log(errorBuffer);
            });

            process.on("close",(code,signal)=>{
                console.log("Command return signal", code, signal)
                if(code==0){
                    //trigger complete ack to renderer
                    console.log("upload stats finish")
                    spawnProcess.splice(spawnProcess.indexOf(process,1))
                    //send dbase_tablename_ready
                    event.sender.send(`dbase_${arg.tablename}_ready`)
                    event.sender.send(`uploadFileStatus_${arg.session}`)
                }else{
                    // prompt error
                    console.log("Error while importing stats into database")
                    console.log(errorBuffer)
                    event.sender.send(`dbase_${arg.tablename}_error`)
                    spawnProcess.splice(spawnProcess.indexOf(process,1))
                }
            })
        }
    })
})


// Get computer uniqye id 
ipcMain.on('comp_id', (event,args)=>{
    machineId().then(id => {
        event.sender.send("comp_id_res", id)
    })
})
// Query Latest Stats
ipcMain.on("queryLatestStats", (event, args)=>{
    let db = new sqlite3.Database(defaultDbPath, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the core database.');
        console.log('Query latest stats from table ' + args.table)
    });

    db.all(`SELECT * FROM ${args.table} LIMIT 100`, (err, rows)=>{
        event.sender.send("queryLatestStats", rows)
    })
})

ipcMain.on("query", (event, args)=>{
    let db = new sqlite3.Database(defaultDbPath, (err)=>{
        if(err) {
            console.error(err.message)
        }
    })

    db.all(args.query, (err, rows)=>{
        if(!err){
            event.sender.send(`query_${args.session}`, {status: 'Ok', result: rows})
        }else{
            console.log(err.message)
            console.log("Query error: " + args.query)
            event.sender.send(`query_${args.session}`,{status: 'Error'})
        }
    })
})

ipcMain.on("querybig", (event, args)=>{
    let db = new sqlite3.Database(defaultDbPath, (err)=>{
        if(err) {
            console.error(err.message)
        }
    })

    db.all(args.query, (err, rows)=>{
        if(!err){
            event.sender.send(`querybig_${args.session}`, {status: 'Ok', result: JSON.stringify(rows)})
        }else{
            console.log(err.message)
            console.log("Query error: " + args.query)
            event.sender.send(`querybig_${args.session}`,{status: 'Error'})
        }
    })
})

ipcMain.on("update",(event, args)=>{
    let db = new sqlite3.Database(defaultDbPath, (err)=>{
        if(err) {
            console.error(err.message)
        }
    })

    db.exec(args.query, (err)=>{
        if(!err){
            event.sender.send(`update_${args.session}`, {status: 'Ok'})
        }else{
            console.log(err.message)
            console.log("Update error: " + args.query)
            event.sender.send(`update_${args.session}`,{status: 'Error'})
        }
    })
})

ipcMain.on("delete",(event, args)=>{
    let db = new sqlite3.Database(defaultDbPath, (err)=>{
        if(err) {
            console.error(err.message)
        }
    })

    db.exec(args.query, (err)=>{
        if(!err){
            event.sender.send(`delete_${args.session}`, {status: 'Ok'})
        }else{
            console.log(err.message)
            console.log("Delete error: " + args.query)
            event.sender.send(`delete_${args.session}`,{status: 'Error'})
        }
    })
})

ipcMain.on("create",(event, args)=>{
    let db = new sqlite3.Database(defaultDbPath, (err)=>{
        if(err) {
            console.error(err.message)
        }
    })

    db.exec(args.query, (err)=>{
        if(!err){
            event.sender.send(`create_${args.session}`, {status: 'Ok'})
        }else{
            console.log(err.message)
            console.log("Create error: " + args.query)
            event.sender.send(`create_${args.session}`,{status: 'Error'})
        }
    })
})

ipcMain.on("run", (event, args)=>{
    let db = new sqlite3.Database(defaultDbPath, (err)=>{
        if(err){
            console.err(err.message)
        }
    })

    db.run(args.query, function(err){
        if(!err){
            console.log("Run completed")
            console.log(this.changes)
            event.sender.send(`run_${args.session}`,{status:'Ok',affectedRows:this.changes})
        }else{
            console.log(err)
            event.sender.send(`run_${args.session}`,{status:'Error'})
        }
    })
})

ipcMain.on("linkDatabase", (event)=>{
    dialog.showOpenDialog({properties:["openFile"], filters:[{name:'database',extensions:["db"]}]}).then((dialogResult)=>{
        if(!dialogResult.canceled){
            let filePaths = dialogResult.filePaths;

            configuration.dbPath = filePaths[0]
            defaultDbPath = filePaths[0]
            fs.writeFile(configFilePath, JSON.stringify(configuration), (fileErr)=>{
                if(!fileErr){
                    event.sender.send("linkDatabase", {status:'Ok',result:'linked'})
                }else{
                    event.sender.send("linkDatabase", {status:'Ok',result:'linkError'})
                }
            })
        }else{
            event.sender.send("linkDatabase", {status:'Ok',result:'close'})
        }
    })
})

ipcMain.on("whereismydb", ()=>{
    const { spawn } = require("child_process")
    const dbFolder = path.dirname(defaultDbPath)
    spawn("explorer", [dbFolder])
})

// Auto Update
autoUpdater.on("update-available", ()=>{
    mainWindow.webContents.send("update_available")
})

autoUpdater.on("update-downloaded", ()=>{
    mainWindow.webContents.send("update_downloaded")
})

ipcMain.on("download_update",(event)=>{
    autoUpdater.downloadUpdate()
})

ipcMain.on("quit_install", ()=>{
    autoUpdater.quitAndInstall()
})