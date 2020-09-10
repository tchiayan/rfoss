const isDev = require('electron-is-dev')
const path = require('path')
const { ipcMain , dialog , app , Menu , BrowserWindow , electron } = require('electron')
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment')
const { autoUpdater } = require("electron-updater");
const csv = require('csv-parser')
//const express = require('express')
const machineId = require('node-machine-id').machineId
const csvImporter = require("./import-csv-sqlite.js");

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

autoUpdater.logger = require("electron-log")
autoUpdater.logger.transports.file.level = "info"

if(fs.existsSync(configFilePath)){
    configuration = JSON.parse(fs.readFileSync(configFilePath, {encoding:"utf-8"}))
    defaultDbPath = configuration.dbPath
}else{
    // Create config file
    configuration = {dbPath:defaultDbPath}
    fs.writeFileSync(configFilePath, JSON.stringify(configuration), {encoding:'utf-8'})
    // defaultDbPath = "./core.db"
}

function runApp(){
    createWindow()
}

function createWindow() {
    mainWindow = new BrowserWindow({ 
        width: 1000, 
        height: 700 , 
        webPreferences: {
            nodeIntegration: true
        },
        minWidth: 950,
        minHeight: 600,
    })

    // `file://${path.join(__dirname, '../build/index.html')}`
    mainWindow.loadURL(
        //isDev ? 'http://localhost:3000' : 'http://localhost:5151/',
        isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`,
    )

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    
    mainWindow.removeMenu()
    mainWindow.setMenu(null)

    //mainWindow.webContents.openDevTools({mode:'bottom'})
    autoUpdater.autoDownload = false
    //autoUpdater.setFeedURL('https://storage.googleapis.com/rfoss/')
    autoUpdater.checkForUpdatesAndNotify();

    //Testing for update
    //setTimeout(()=>{
    //    console.log("update_available")
    //    mainWindow.webContents.send("update_available") 
    //},10000)

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

ipcMain.on(`uploadFileStatus_csv`, (event,arg) => {
    dialog.showOpenDialog({
        filters: [
            //{name: "All Files", extensions: ["*"]},
            {name: 'CSV',extensions: ['csv']}
        ],
        properties: ['openFile']
    }).then((dialogResult)=>{
        if(!dialogResult.canceled){
            let filePaths = dialogResult.filePaths;
            //let rowNum = 1
            let headerRow = arg.options.uploadingHeader
            let headerCol = arg.options.alias[arg.tablename].reduce((obj , col) => {
                obj[col['name']] = col['field']
                return obj
            },{})
            let tablename = arg.tablename
            let uploadServerAddress = arg.uploadServerAddress
            let _csvImporter = new csvImporter(defaultDbPath , uploadServerAddress)
            
            _csvImporter.on("ready", () =>{
                event.sender.send('uploadFileStatus_csv_'+arg.session+'_start')
                _csvImporter.uploadCsv(filePaths[0], headerRow , headerCol, tablename)
            })

            _csvImporter.on("error", (err) => {
                event.sender.send(`uploadFileStatus_csv_${arg.session}_error` , err)
            })

            _csvImporter.on("progress" , (status) => {
                event.sender.send(`uploadFileStatus_csv_${arg.session}_counter`, status)
                console.log(status)
            })

            _csvImporter.on("done", () => {
                event.sender.send(`uploadFileStatus_csv_${arg.session}`)
            })
        }
    })
})

//ipcMain.on(`uploadFileStatus_csv`, (event,arg) => {
ipcMain.on(`uploadFileStatus_csv_debugging`, (event,arg) => {
    dialog.showOpenDialog({
        filters: [
            //{name: "All Files", extensions: ["*"]},
            {name: 'CSV',extensions: ['csv']}
        ],
        properties: ['openFile']
    }).then((dialogResult)=>{
        if(!dialogResult.canceled){
            let filePaths = dialogResult.filePaths;
            let rowNum = 1
            let headerRow = arg.options.uploadingHeader
            let headerCol = arg.options.alias[arg.tablename]
            let headerCheck = null
            let uploadData = [] // buckets
            let uploadBatchSize = 300
            let totalUpload = 0
            let uploadBatchCount = 0
            let error = 0;
            let success = 0;
            event.sender.send('uploadFileStatus_csv_'+arg.session+'_start')

            /* Get total row of the csv file*/
            let totalRows = 0;
            fs.createReadStream(filePaths[0])
                .pipe(csv({skipLines: headerRow !== 1 ? headerRow : 0}))
                .on("data", (row) => {
                    totalRows++;
                })
                .on("end", ()=>{
                    console.log(`Total rows: ${totalRows}`)

                    let fileStream = fs.createReadStream(filePaths[0])
                    let csvStream = csv({skipLines: headerRow !== 1 ? headerRow : 0})
                    let dbC = new sqlite3.Database(defaultDbPath)

                    fileStream.pipe(csvStream)
                        .on("data", (row) => {
                            // check upload file header match with configuration header
                            if(headerCheck === null){
                                let configHeader = Object.values(headerCol)
                                let uploadHeader = Object.keys(row)
                                let headerContain = configHeader.map(col => uploadHeader.includes(col))
        
                                headerCheck = !headerContain.includes(false)
                                console.log(`Upload table match with config header: ${headerCheck}`)
        
                                if(headerCheck === false){
                                    // print missing header 
                                    console.log(`CSV Header: ${uploadHeader.join(" , ")}`)
                                    console.log(`Missing header: ${configHeader.filter(col => !uploadHeader.includes(col)).join(" , ")}`)
                                    
                                }
                            }
                            
                            // check database table exist , create table if not exist
                            if(headerCheck === true && uploadData.length === 0 && uploadBatchCount === 0){
                                

                                csvStream.pause()
                                new Promise((resolve, reject)=>{
                                    let db = new sqlite3.Database(defaultDbPath, async (err) => {
                                        if(err){
                                            reject("Unable to connect to database")    
                                        }

                                        db.all(`SELECT * FROM sqlite_master WHERE type = 'table' and name = '${arg.tablename}'`, (err , row) => {
                                            if(err){
                                                reject(new Error("Upload fail. Unable to lookup table.")) 
                                            }else{
                                                if(row.length === 0 && uploadData.length > 0){
                                                    // create table
                                                    console.log("Upload table not existed. Creating new table")
                                                    let configHeader = Object.entries(headerCol).map(([key , col]) => {
                                                        let val = uploadData[0][col]
                                                        //console.log(`${val} | type [${typeof val}] | is date [${moment(val, "YYYY-MM-DD HH:mm:ss", true).isValid() || moment(val, "MM/DD/YYYY HH:mm", true).isValid()}] [${moment(val, "M/DD/YYYY H:mm", true).isValid()}]`)
                                                        if(val.match(/(?<percentage>\d{1,}\.?\d*)%/,'i')){
                                                            return [key , 'REAL']
                                                        }else if(!isNaN(val)){
                                                            return [key , 'REAL']
                                                        }else if(moment(val, "YYYY-MM-DD HH:mm:ss", true).isValid() || moment(val, "M/D/YYYY H:mm", true).isValid()){
                                                            return [key , 'DATE']
                                                        }else{
                                                            return [key , 'TEXT']
                                                        }
                                                        
                                                    })
            
                                                    
                                                    db.exec(`CREATE TABLE ${arg.tablename} ( ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL , ${configHeader.map(val => val.join(" ")).join(" , ")} )`, (err)=>{
                                                        if(err){ 
                                                            console.log(`CREATE TABLE ${arg.tablename} ( ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL , ${configHeader.map(val => val.join(" ")).join(" , ")} )`)
                                                            console.log(err)
                                                            reject(new Error('Upload fail. Unable to create new table'))
                                                        }else{
                                                            console.log(`New table created`)
                                                            resolve(true)
                                                        }
                                                        
                                                    })
                                                }else{
                                                    resolve(true)
                                                }
                                            }
                                        })
                                    })
                                    
                                }).finally(()=>{
                                    csvStream.resume()
                                })
                                
                            }

                            // Append upload data
                            uploadData.push(row)

                            // Upload data by batch of 100
                            if(uploadData.length === uploadBatchSize){
                                csvStream.pause();

                                let uploadKey = Object.keys(headerCol)
                                let uploadCol = Object.values(headerCol)
                                let uploadInsert = uploadData.map(row => ` (${uploadCol.map(col => {
                                    let val = row[col]
                                    if(val === ""){
                                        return `null`
                                    }else if(val.match(/(?<percentage>\d{1,}\.?\d*)%/,'i')){
                                        return parseFloat(val.match(/(?<percentage>\d{1,}\.?\d*)%/,'i').groups.percentage)
                                    }else if(!isNaN(val)){
                                        return parseFloat(val)
                                    }else if(moment(val, "YYYY-MM-DD HH:mm:ss", true).isValid()){
                                        return `'${val}'`
                                    }else if(moment(val, "M/D/YYYY H:mm", true).isValid()){ // After Excel edited csv date format
                                        return `'${moment(val, "M/D/YYYY H:mm").format('YYYY-MM-DD HH:mm:ss')}'`
                                    }else{
                                        return `'${val}'`
                                    }
                                }).join(" , ")} )`)

                                dbC.exec(`INSERT INTO ${arg.tablename} ( ${uploadKey.join(" , ")}) VALUES ${uploadInsert.join(" , ")}`, (err)=>{
                                    if(err){
                                        error += uploadInsert.length;
                                    }else{
                                        success += uploadInsert.length;
                                    }
                                    totalUpload += uploadInsert.length;
                                    uploadData = []
                                    uploadBatchCount++;

                                    //console.log(`Upload progress: ${parseFloat((totalUpload/totalRows).toFixed(2))}`)
                                    event.sender.send(`uploadFileStatus_csv_${arg.session}_counter`, {progress:parseFloat((totalUpload/totalRows).toFixed(2))})
                                    csvStream.resume()
                                
                                })
                            }
                            
                        })
                        .on("end", () => {
                            let uploadKey = Object.keys(headerCol)
                            let uploadCol = Object.values(headerCol)
                            let uploadInsert = uploadData.map(row => ` (${uploadCol.map(col => {
                                let val = row[col]
                                if(val === ""){
                                    return `null`
                                }else if(val.match(/(?<percentage>\d{1,}\.?\d*)%/,'i')){
                                    return parseFloat(val.match(/(?<percentage>\d{1,}\.?\d*)%/,'i').groups.percentage)
                                }else if(!isNaN(val)){
                                    return parseFloat(val)
                                }else if(moment(val, "YYYY-MM-DD HH:mm:ss", true).isValid()){
                                    return `'${val}'`
                                }else if(moment(val, "M/D/YYYY H:mm", true).isValid()){ // After Excel edited csv date format
                                    return `'${moment(val, "M/D/YYYY H:mm").format('YYYY-MM-DD HH:mm:ss')}'`
                                }else{
                                    return `'${val}'`
                                }
                            }).join(" , ")} )`)

                            dbC.exec(`INSERT INTO ${arg.tablename} ( ${uploadKey.join(" , ")}) VALUES ${uploadInsert.join(" , ")}`, (err)=>{
                                if(!!err){
                                    error += uploadInsert.length;
                                    console.log(err)
                                }else{
                                    success += uploadInsert.length;
                                }
                                totalUpload += uploadInsert.length;
                                uploadData = []
                                event.sender.send(`uploadFileStatus_csv_${arg.session}_counter`, {progress:parseFloat((totalUpload/totalRows).toFixed(2))})
                                console.log(`Upload done status: Sucess ${success} Error ${error} Total ${totalUpload}`)
                                csvStream.resume()
                            
                            })
                            //console.log(`INSERT INTO ${arg.tablename} ( ${uploadKey.join(" , ")}) VALUES ${uploadInsert.join(" , ")}`)
                            
                            event.sender.send(`uploadFileStatus_csv_${arg.session}`)
                        })
                })  
            
        }
    })
})

ipcMain.on('uploadFileStatus_excel', (event, arg) => {
    dialog.showOpenDialog({
        filters: [{
            name: 'Excel',
            extensions: ['xlsx']
        }],
        properties: ['openFile']
    }).then((dialogResult)=>{
        if(!dialogResult.canceled){
            let filePaths = dialogResult.filePaths;
            
            const { spawn } = require("child_process")
            const script = isDev ?  `${__dirname}\\..\\python\\upload.py` : `${__dirname}/../../app.asar.unpacked/upload.exe`
            //const script = isDev ?  `${__dirname}/upload.exe` : `${__dirname}/../../app.asar.unpacked/upload.exe`
            const scriptArgv = ['upload', defaultDbPath ,arg.tablename, filePaths[0]]
            
            event.sender.send('uploadFileStatus_excel_'+arg.session+'_start')
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
                    event.sender.send('uploadFileStatus_excel_'+arg.session+'_counter', data_json)
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
                    //event.sender.send(`dbase_${arg.tablename}_ready`)
                    event.sender.send(`uploadFileStatus_excel_${arg.session}`)
                }else{
                    // prompt error
                    console.log("Error while importing stats into database")
                    console.log(errorBuffer)
                    event.sender.send(`uploadFileStatus_excel_${arg.tablename}_error`)
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
    setTimeout(()=>{
        mainWindow.webContents.send("update_available")
    }, [ 10000 ])
    
})

autoUpdater.on("update-downloaded", ()=>{
    setTimeout(()=>{
        mainWindow.webContents.send("update_downloaded")
    }, [ 10000 ])
    
})

ipcMain.on("download_update",(event)=>{
    autoUpdater.downloadUpdate()
})

ipcMain.on("quit_install", ()=>{
    autoUpdater.quitAndInstall()
})