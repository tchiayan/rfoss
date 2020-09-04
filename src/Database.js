
class Database {
    constructor(){
        this.electron = window.require('electron')
        this.ipcRenderer = this.electron.ipcRenderer;
    }

    send(channel){
        this.ipcRenderer.send(channel)
    }

    getComputerID(){
        this.ipcRenderer.send("comp_id")

        return new Promise((resolve)=>{
            this.ipcRenderer.once("comp_id_res", (event, id)=>{
                resolve(id)
            })
        })
    }

    async listenAvailableUpdate(){
        return new Promise((resolve)=>{
            this.ipcRenderer.once("update_available",()=>{
                resolve(true)
            })
        })
    }

    async listenUpdateDownloaded(){
        return new Promise((resolve)=>{
            this.ipcRenderer.once("update_downloaded",()=>{
                resolve(true)
            })
        })
    }
    
    async linkDatabase(){
        this.ipcRenderer.send("linkDatabase")

        return new Promise((resolve, reject)=>{
            this.ipcRenderer.once(`linkDatabase`, (event, result)=>{
                resolve(result)
            })
        })
    }

    downloadUpdate(){
        this.ipcRenderer.send("download_update")
    }
    
    quitAndInstall(){
        this.ipcRenderer.send("quit_install")
    }

    async query(queryString){
        const session = Math.random().toString(16).slice(2)

        this.ipcRenderer.send("query", {
            query: queryString, 
            session: session
        })

        return new Promise((resolve, reject)=>{
            this.ipcRenderer.once(`query_${session}`, (event, result)=>{
                resolve(result)
            })
        })
    }

    async excelService(steps){
        const session = Math.random().toString(16).slice(2)
        this.ipcRenderer.send("excel", {
            steps: steps, 
            session: session
        })

        return new Promise((resolve, reject)=>{
            this.ipcRenderer.once(`excel_${session}`, (event, result)=>{
                resolve(result)
            })
        })
    }

    async querybig(queryString){
        const session = Math.random().toString(16).slice(2)

        this.ipcRenderer.send("querybig", {
            query: queryString, 
            session: session
        })

        return new Promise((resolve, reject)=>{
            this.ipcRenderer.once(`querybig_${session}`, (event, result)=>{
                resolve(result)
            })
        })
    }

    /**
     * 
     * @typedef {Object} QueryResponse
     * @property {string} status Status of query "Ok" or "Error"
     * @property {Array} [result]  Return results in array of object (key , value) if status is 'Ok'
     * 
     */

    /**
     * Database update operation
     * @param {*} queryString SQL Update String
     * 
     * @returns {Promise<QueryResponse>} Update operation status
     */
    async update(queryString){
        const session = Math.random().toString(16).slice(2)

        this.ipcRenderer.send("update", {
            query: queryString, 
            session: session
        })

        return new Promise((resolve, reject)=>{
            this.ipcRenderer.once(`update_${session}`, (event, result)=>{
                resolve(result)
            })
        })
    }

    async delete(queryString){
        const session = Math.random().toString(16).slice(2)

        this.ipcRenderer.send("delete", {
            query: queryString, 
            session: session
        })

        return new Promise((resolve, reject)=>{
            this.ipcRenderer.once(`delete_${session}`, (event, result)=>{
                resolve(result)
            })
        })
    }

    async create(queryString){
        const session = Math.random().toString(16).slice(2)

        this.ipcRenderer.send("create", {
            query: queryString, 
            session: session
        })

        return new Promise((resolve, reject)=>{
            this.ipcRenderer.once(`create_${session}`, (event, result)=>{
                resolve(result)
            })
        })
    }

    async run(queryString){
        const session = Math.random().toString(16).slice(2)

        this.ipcRenderer.send("run", {
            query: queryString, 
            session: session
        })

        return new Promise((resolve, reject)=>{
            this.ipcRenderer.once(`run_${session}`, (event, result)=>{
                resolve(result)
            })
        })
    }
    
    tableExist(tablename){
        return this.query(`SELECT * FROM sqlite_master WHERE type = 'table' and name = '${tablename}'`).then((response)=>{
            if(response.status === 'Ok'){
                if(response.result.length > 0){
                    return true
                }else{
                    return false
                }
            }else{
                throw Error("Unable to check table exist")
            }
        })
    }
    
    async createTableIfNotAssist(tablename, createSQL){
        return this.query(`SELECT * FROM sqlite_master WHERE type = 'table' and name = '${tablename}'`).then((response)=>{
            if(response.status === 'Ok'){
                if(response.result.length > 0){
                    //console.log(`Table ${tablename} exist.`)
                    return {status: 'Done'}
                }else{
                    return this.create(createSQL)
                }
            }else{
                throw Error('Unable to check table exist')
            }
        }).then((response)=>{
            if(response.status === 'Ok'){
                return {status:'Table_created'}
            }else if(response.status === 'Error'){
                //console.log(`Table ${tablename} created unsuccessfully`)
                throw Error('Unable to create table')
            }else if(response.status === 'Done'){
                return {status: 'Table_exist'}
            }
        })
    }

    mainDb(tablename, callback){
        this.query(`SELECT * FROM sqlite_master WHERE type = 'table' and name = '${tablename}'`).then((response)=>{
            if(response.status === 'Ok'){
                if(response.result.length > 0){
                    callback()
                }else{
                    console.log("Waiting for new data upload for table creation")
                    this.ipcRenderer.once(`dbase_${tablename}_ready`, ()=>{
                        console.log("Main table created and upload successfully")
                        callback()
                    })
                }
            }else{
                console.log("error")
            }
        })
    }

    upload(tablename, uploadingFormat ,  onUploadingStart, onUploadingCallback , onFinishCallback, onUploadError, options){
        const session = Math.random().toString(16).slice(2)
        this.ipcRenderer.send(`uploadFileStatus_${uploadingFormat}`,{session: session, tablename:tablename, options:options})

        const listener = (event, arg)=>{
            //console.log(arg)
            onUploadingCallback(arg) // {"update_count":number}
        }   

        this.ipcRenderer.once(`uploadFileStatus_${uploadingFormat}_${session}_start`, ()=>{
            onUploadingStart()
            console.log(`uploadFileStatus_${uploadingFormat}_${session}_counter`)
            this.ipcRenderer.on(`uploadFileStatus_${uploadingFormat}_${session}_counter`, listener)
        })

        this.ipcRenderer.once(`uploadFileStatus_${uploadingFormat}_${session}`, (event, arg)=>{
            // remove counter listener
            this.ipcRenderer.removeListener(`uploadFileStatus_${uploadingFormat}_${session}_counter`, listener)
            onFinishCallback()
        })

        this.ipcRenderer.once(`uploadFileStatus_${uploadingFormat}_${session}_error`, (event , errorParams)=>{
            // remove counter listener
            console.log(`Error detected`)
            console.log(errorParams)
            this.ipcRenderer.removeListener(`uploadFileStatus_${uploadingFormat}_${session}_counter`, listener)
            onUploadError()
        })
    }

}

class TableSerial{

}

export {
    Database,
    TableSerial
}