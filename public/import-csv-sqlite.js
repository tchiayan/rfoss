const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
const csv = require('csv-parser')
const EventEmitter = require('events').EventEmitter;
const moment = require('moment')

class CsvSqlLite extends EventEmitter{
    constructor(dbPath , socket = false){
        super()
        this.db = new sqlite3.Database(dbPath , (err) => {
            if(err){
                this.emit('error', new Error("Unable to connect to database. Check database exist?"))
                //this.emit('error', new Error("Unable to connect to database. Check database exist?"))
            }else{
                this.emit("ready")
                //this.emit("ready") // ready to read csv file
            }
        })

        if(socket){
            this.socket = require('socket.io-client')('http://localhost:8080')
        }
    }
    
    /**
     * Change array of object to array of string (VALUES of SQL UPDATE operation)
     * @param {Array<Object>} rowdata Array of rows data
     * @param {Array<string>} columns Array of upload keys
     * @returns {Array<string>} Array of update value string
     */
    normalizeRowdataToRowvalues(rowdata , columns){
        return rowdata.map(row => ` (${columns.map(col => {
            let val = row[col]
            if(val === ""){
                return `null`
            }else if(val.match(/(?<percentage>\d{1,}\.?\d*)%/,'i')){
                return parseFloat(val.match(/(?<percentage>\d{1,}\.?\d*)%/,'i').groups.percentage)
            }else if(!isNaN(val)){
                return parseFloat(val)
            }else if(val.match(/^(\d{3},){0,}\d{3}(\.\d{1,})?$/)){
                return parseFloat(val.replace(/,/g, ""))
            }else if(moment(val, "YYYY-MM-DD HH:mm:ss", true).isValid()){
                return `'${val}'`
            }else if(moment(val, "M/D/YYYY H:mm", true).isValid()){ // After Excel edited csv date format
                return `'${moment(val, "M/D/YYYY H:mm").format('YYYY-MM-DD HH:mm:ss')}'`
            }else{
                return `'${val}'`
            }
        }).join(" , ")} )`)
    }
    
    
    /**
     * Peformed upload sql operation
     * @param {Array<string>} columns INSERT columns 
     * @param {Array<string>} values INSERT values (string of upload value)
     * @param {string} table INSERT table
     * 
     * @returns {Promise<boolean|void>} 
     */
    uploadSql(columns , values , table){
        return new Promise((resolve , reject) => {
            this.db.exec(`INSERT INTO ${table} ( ${columns.join(" , ")}) VALUES ${values.join(" , ")}` , (err) => {
                if(err){
                    reject(new Error("INSERT command failed"))
                }else{
                    if(this.socket){ // update to online database
                        this.uploadToOnlineDatabase(columns , values , table).then(() => {
                            resolve(true)
                        }).catch(() => {
                            resolve(false)
                            console.log(`Upload to online database fail`)
                        })
                    }else{
                        resolve({updatedOnline:null})
                    }
                }
            })
        })
    }
    
    /**
     * 
     * @param {Array<string>} columns COLUMN INSERT sql syntax section
     * @param {Array<string>} values VALUES INSERT sql syntax section
     * @param {string} table INSERT sql table target
     * 
     * @returns {Promise<void>}
     */
    uploadToOnlineDatabase(columns, values , table){
        return new Promise((resolve , reject) => {
            this.socket.on("updateSuccess" , () => {
                this.socket.off("updateSuccess")
                this.socket.off("updateFail")
                resolve()
            })

            this.socket.on("updateFail" , () => {
                this.socket.off("updateFail")
                this.socket.off("updateSuccess")
                reject(new Error("Update to online database fail"))
            })

            this.socket.emit("update" , table , columns , values)
        })
    }

    uploadCsv(filePath, headerRow, headerCol, tablename){
        let totalRows = 0;
        let headerCheck = null
        let uploadData = [] // buckets
        let uploadBatchSize = 300
        let totalUpload = 0
        let uploadBatchCount = 0
        let error = 0;
        let success = 0;
        fs.createReadStream(filePath)
            .pipe(csv({skipLines: headerRow !== 1 ? headerRow: 0}))
            .on("data", () =>{
                totalRows++;
            })
            .on("end", () => {
                let fileStream = fs.createReadStream(filePath)
                let csvStream = csv({skipLines: headerRow !== 1 ? headerRow: 0})
                

                fileStream.pipe(csvStream)
                    .on("data", (row) => {
                        if(headerCheck === null){
                            let configHeader = Object.values(headerCol)
                            let uploadHeader = Object.keys(row)
                            let headerContain = configHeader.map(col => uploadHeader.includes(col))

                            headerCheck = !headerContain.includes(false)
                            console.log(`Upload table match with config header: ${headerCheck}`)
    
                            if(headerCheck === false){
                                // print missing header 
                                csvStream.destroy()
                                this.emit('error', {error:"Upload header is not match with database header", detail:`Missing header: ${configHeader.filter(col => !uploadHeader.includes(col)).join(" , ")}`})
                                
                            }
                        }

                        // check database table exist , create table if not exist
                        if(headerCheck === true && uploadData.length === 0 && uploadBatchCount === 0){
                            csvStream.pause()
                            this.db.all(`SELECT * FROM sqlite_master WHERE type = 'table' and name = '${tablename}'`, (err , row) => {
                                if(err){
                                    this.emit("error" , new Error("Upload fail. Unable to lookup table.")) 
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

                                        
                                        this.db.exec(`CREATE TABLE ${tablename} ( ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL , ${configHeader.map(val => val.join(" ")).join(" , ")} )`, (err)=>{
                                            if(err){ 
                                                console.log(`CREATE TABLE ${tablename} ( ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL , ${configHeader.map(val => val.join(" ")).join(" , ")} )`)
                                                this.emit(new Error('Upload fail. Unable to create new table'))
                                                csvStream.destroy()
                                            }else{
                                                console.log(`New table created`)
                                                csvStream.resume()
                                            }
                                            
                                        })
                                    }else{
                                        csvStream.resume()
                                    }
                                }
                            })
                        }


                        // Append upload data
                        uploadData.push(row)


                        // Upload data by batch of 100
                        if(uploadData.length === uploadBatchSize){
                            csvStream.pause();

                            let uploadKey = Object.keys(headerCol)
                            let uploadCol = Object.values(headerCol)
                            let uploadInsert = this.normalizeRowdataToRowvalues(uploadData , uploadCol)

                            this.uploadSql(uploadKey ,  uploadInsert , tablename).then(() => {
                                success += uploadInsert.length;
                            }).catch((err) => {
                                console.log(err)
                                error += uploadInsert.length;
                            }).finally(() => {
                                totalUpload += uploadInsert.length;
                                uploadData = []
                                uploadBatchCount++;
                                this.emit("progress", {progress:parseFloat((totalUpload/totalRows).toFixed(2)), success: success , error: error , total:totalUpload})
                                csvStream.resume()
                            })
                        }
                    })
                    .on("end", ()=>{
                        let uploadKey = Object.keys(headerCol)
                        let uploadCol = Object.values(headerCol)
                        let uploadInsert = this.normalizeRowdataToRowvalues(uploadData , uploadCol)

                        this.uploadSql(uploadKey ,  uploadInsert , tablename).then(() => {
                            success += uploadInsert.length;
                        }).catch((err) => {
                            console.log(err)
                            error += uploadInsert.length;
                        }).finally(() => {
                            totalUpload += uploadInsert.length;
                            uploadData = []
                            uploadBatchCount++;
                            this.emit("progress", {progress:parseFloat((totalUpload/totalRows).toFixed(2)), success: success , error: error , total:totalUpload})
                            csvStream.resume()
                        })
                        this.db.exec(`INSERT INTO ${tablename} ( ${uploadKey.join(" , ")}) VALUES ${uploadInsert.join(" , ")}`, (err)=>{
                            if(!!err){
                                error += uploadInsert.length;
                                console.log(err)
                            }else{
                                success += uploadInsert.length;
                            }
                            totalUpload += uploadInsert.length;
                            uploadData = []
                            this.emit("progress", {progress:parseFloat((totalUpload/totalRows).toFixed(2))})
                            this.emit("done")
                            console.log(`Upload done status: Sucess ${success} Error ${error} Total ${totalUpload}`)
                            csvStream.resume()
                        
                        })
                    })
            })
    }
}

module.exports = CsvSqlLite