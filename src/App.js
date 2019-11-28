import React from 'react';
import './App.css';
//import { ipcRenderer } from  'electron';
import { Button , Dropdown , Card  , Form, Table , Col , Modal , Spinner } from "react-bootstrap";
//import { ReactComponent as Cancel } from './Cancel.svg'
import { Snackbar , IconButton } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';

import KpiGraph from './KpiGraph';


// Ag-grid Import
import { AgGridReact } from '@ag-grid-community/react';
import {AllCommunityModules} from '@ag-grid-community/all-modules';

import '@ag-grid-community/all-modules/dist/styles/ag-grid.css';
import '@ag-grid-community/all-modules/dist/styles/ag-theme-balham.css';

import { Database } from './Database';

// Props
// - action = function to run when user click confirm
class Delete extends React.Component{
  constructor(props){
    super(props)

    this.state = {
      showConfirm: false
    }

    this.showConfirmation = this.showConfirmation.bind(this)
    this.confirmDelete = this.confirmDelete.bind(this)
    this.cancelDelete = this.cancelDelete.bind(this)
  }

  showConfirmation(){
    this.setState({showConfirm:true})
  }

  confirmDelete(){
    this.setState({showConfirm:false})
    this.props.action()
  }

  cancelDelete(){
    this.setState({showConfirm:false})
  }

  render(){
    let {
      confirmText,
      children
    } = this.props
    return <div>
      <div style={{color:'red', cursor:'pointer'}} onClick={this.showConfirmation}>{children? children: 'Delete'}</div>
      <Modal show={this.state.showConfirm} onHide={()=>{this.setState({showConfirm:false})}} centered size="sm"> 
        <Modal.Body>
          <div style={{marginBottom:"13px", textAlign:'center'}}>{confirmText? confirmText: 'Proceed to delete this?'}</div>
          <div style={{display:'flex', justifyContent:'space-around'}}>
            <Button onClick={this.confirmDelete} variant="warning">Confirm</Button>
            <Button onClick={this.cancelDelete}>Cancel</Button>
          </div>
          
        </Modal.Body>
      </Modal>
    </div>
  }
}

class App extends React.Component{
  constructor(){
    super()

    this.config = [
      {
        project: 'Maxis MR',
        tablename: 'main'
      }
    ]

    this.state = {
      uploading_count: "",
      uploading: false,
      removingDuplicated: false,  
      removingAll: false, 
      tables: [],
      selectedTable: null,
      selectedTableData: [],
      selectedTableColDefs: [],
      counterName: [],
      kpiList: [],
      charts: [],
      selectedProject: null,
      mrlayerseries: 0,
      mrlayerlist: [],
      mrmainseries: 0,
      mrmainlist: [],
      kpiGraphDialog: false,
      updateAvailable: false, 
      updateDownloaded: false, 
      snack:{
        open: false, 
        message: ''
      }
    }

    this.projectSelectHandler = this.projectSelectHandler.bind(this)
    this.handleKpiSubmit = this.handleKpiSubmit.bind(this)
    this.addBhLayerChartHandler = this.addBhLayerChartHandler.bind(this)
    this.handleKpiGraphClose = this.handleKpiGraphClose.bind(this)
    this.addBhMainChartHandler = this.addBhMainChartHandler.bind(this)
    this.handleSnackClose = this.handleSnackClose.bind(this)
    this.handleSnackUpdateClose = this.handleSnackUpdateClose.bind(this)
    this.handleSnackUpdateDownloadedClose = this.handleSnackUpdateDownloadedClose.bind(this)
  }

  whereismydb(){
    let db = new Database()
    db.send("whereismydb")
  }

  downloadUpdate(){
    let db = new Database()
    this.setState({updateAvailable:false})
    db.send("download_update")
  }
  installUpdate(){
    let db = new Database()
    db.send("quit_install")
  }

  handleSnackUpdateClose(){
    this.setState({updateAvailable:false})
  }

  handleSnackUpdateDownloadedClose(){
    this.setState({updateDownloaded:false})
  }

  handleSnackClose(){
    let snack = this.state.snack;
    snack.open = false 
    snack.message = ""
    this.setState({snack:snack})
  }
  
  handleKpiGraphClose(){
    this.setState({kpiGraphDialog:false})
  }

  handleKpiSubmit(event){
    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget;
    const kpiName = form.querySelector("#form-kpi-name").value
    let kpiFormula = form.querySelector("#form-kpi-formula").value 

    // Check formula correctness 
    let C = this.state.counterName.slice().map(counter => counter.name).reduce((obj, name)=>{
      obj[name] = 1
      return obj
    }, {})

    let formula = kpiFormula
    formula = formula.replace(/(avg|sum)/gi, "")
    formula = formula.replace(/(\w+_)/gi, "C.$1")

    try{
      eval(formula)
      let updateString = `INSERT INTO formulas ( name , formula , table_stats ) VALUES ( '${kpiName}' , '${kpiFormula}' , '${this.state.selectedProject.tablename}')`
      let db = new Database()
      db.update(updateString).then((response)=>{
        if(response.status === 'Ok'){
          this.updateKpiList(this.state.selectedProject.tablename)
        }else{
          console.log("Formula update unsuccessfylly.")
        }
      })
    }catch(error){
      console.log("Formula is wrong")
    }
  }

  addBhLayerChartHandler(event){
    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget;
    const layerTitle = form.querySelector("#form-graph-bh-layer-title").value 
    const seriesInfo = this.state.kpiList[this.state.mrlayerseries]

    let db = new Database()
    db.update(`INSERT INTO mrlayerchart ( title , seriesid , seriesname , seriesformula ) VALUES ( '${layerTitle}' , ${seriesInfo.ID} , '${seriesInfo.name}' , '${seriesInfo.formula}')`).then((response)=>{
      if(response.status === 'Ok'){
        this.updateBhLayerChartList()
      }
    })
  }

  addBhMainChartHandler(event){
    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget;
    const title = form.querySelector("#form-graph-bh-main-title").value 
    const seriesInfo = this.state.kpiList[this.state.mrmainseries]
    const baselineTitle = form.querySelector("#form-graph-bh-main-baseline-title").value 
    const baselineValue = form.querySelector("#form-graph-bh-main-baseline-value").value 

    let updateField = {
      title: `'${title}'` , 
      seriesid : seriesInfo.ID , 
      seriesname: `'${seriesInfo.name}'`,
      seriesformula : `'${seriesInfo.formula}'`
    }

    if(!!baselineTitle) updateField['baselinetitle'] = `'${baselineTitle}'`
    if(!!baselineValue) updateField['baselinevalue'] = baselineValue

    let db = new Database()
    db.update(`INSERT INTO mrmainchart (${Object.keys(updateField).join(",")}) VALUES ( ${Object.values(updateField).join(",")}) `).then((response)=>{
      if(response.status === "Ok"){
        this.updateBhMainChartList()
      }
    })
  }

  initDb(){
    let db = new Database()
    db.mainDb(this.config[0].tablename, ()=>{
      this.setState({databaseReady: true})
      this.updateTableColumnAndCountername(this.config[0].tablename)
    })
    
    db.createTableIfNotAssist('mrlayerchart', 'CREATE TABLE mrlayerchart (ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL , title TEXT, seriesid INTEGER NOT NULL, seriesname TEXT NOT NULL, seriesformula TEXT NOT NULL)').then(()=>{
      return db.createTableIfNotAssist('mrmainchart', 'CREATE TABLE mrmainchart (ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL , title TEXT, seriesid INTEGER NOT NULL, seriesname TEXT NOT NULL, seriesformula TEXT NOT NULL, baselinetitle TEXT, baselinevalue REAL)')
    }).then(()=>{
      return db.createTableIfNotAssist('formulas',"CREATE TABLE formulas (ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL, name TEXT NOT NULL, formula TEXT NOT NULL, table_stats TEXT NOT NULL )")
    }).then(()=>{
      
      this.updateKpiList(this.config[0].tablename)
      this.updateBhLayerChartList()
      this.updateBhMainChartList()
    })
  }

  componentDidMount(){
    this.projectSelectHandler(0)
    this.initDb()

    // check for update
    let db = new Database()
    db.listenAvailableUpdate().then(()=>{
      this.setState({updateAvailable:true})
    })

    db.listenUpdateDownloaded().then(()=>{
      this.setState({updateDownloaded:true})
    })
  }

  removeAllRawData(){
    let db = new Database()
    this.setState({removingAll: true})
    db.run(`DELETE FROM ${this.config[0].tablename}`).then((response)=>{
      if(response.status === "Ok"){
        console.log(response.affectedRows)
        let snack = this.state.snack
        snack.open = true 
        snack.message = `${response.affectedRows} rows deleted`
        this.setState({snack:snack})
      }
      this.setState({removingAll: false})
    })
    
  }

  linkDatabase(){
    let db = new Database()
    db.linkDatabase().then((response)=>{
      console.log(response)
      if(response.status === 'Ok'){
        if(response.result === 'linked'){
          console.log("re-establish to new db")
          this.initDb()
        }
      }
    })
  }

  selectFile(){
    let db = new Database()
    db.upload(this.config[0].tablename, 
    ()=>{
      this.setState({uploading:true})
    },(param)=>{
      this.setState({uploading_count:`Upload count ${param.update_count}`})
    }, ()=>{
      this.setState({uploading:false})
    })
  }

  removeDuplicated(){
    this.setState({removingDuplicated: true})
    let db = new Database()
    db.run(`DELETE FROM ${this.config[0].tablename} WHERE ID NOT IN ( SELECT MIN(ID) FROM ${this.config[0].tablename} GROUP BY [Cell_Name], date([Date]))`).then((response)=>{
      if(response.status === 'Ok'){
        console.log(response.affectedRows)
      }
      this.setState({removingDuplicated: false})
    })
  }

  queryLatestStat(){
    (new Database()).query(`select * from ${this.state.selectedTable} limit 100`).then((response)=>{
      if(response.status === 'Ok'){
        this.setState({
          selectedTableData: response.result
        })
      }else{
        console.log(response)
      }
    })
  }

  updateKpiList(tablename){
    let db = new Database()
    db.query(`SELECT ID, name , formula FROM formulas WHERE table_stats = '${tablename}'`).then((response)=>{
      if(response.status === 'Ok'){
        console.log(response.result)
        this.setState({kpiList: response.result})
      }else{
        console.log("Update kpi list unsuccessfully")
      }
    })
  }

  updateBhLayerChartList(tablename){
    let db = new Database()
    db.query(`SELECT ID, title , seriesname, seriesformula FROM mrlayerchart`).then((response)=>{
      if(response.status === 'Ok'){
        console.log(response.result)
        this.setState({mrlayerlist: response.result})
      }else{
        console.log("Update kpi list unsuccessfully")
      }
    })
  }

  updateBhMainChartList(){
    let db = new Database()
    db.query(`SELECT ID, title , seriesname, seriesformula, baselinetitle, baselinevalue FROM mrmainchart`).then((response)=>{
      if(response.status === 'Ok'){
        console.log(response.result)
        this.setState({mrmainlist: response.result})
      }else{
        console.log("Update kpi list unsuccessfully")
      }
    })
  }


  deleteKpiFormula(formulaID){
    let db = new Database()
    db.delete(`DELETE FROM formulas WHERE ID = ${formulaID}`).then((response)=>{
      if(response.status === 'Ok'){
        this.updateKpiList(this.state.selectedProject.tablename)
      }else{
        console.log("Kpi formula remove unsuccessfully")
      }
    })
  } 

  deleteLayerChartList(id){
    let db = new Database()
    db.delete(`DELETE FROM mrlayerchart WHERE ID = ${id}`).then((response)=>{
      if(response.status === 'Ok'){
        this.updateBhLayerChartList()
      }else{
        console.log("layer chart list remove unsuccessfully")
      }
    })
  }

  deleteMainChartList(id){
    let db = new Database()
    db.delete(`DELETE FROM mrmainchart WHERE ID = ${id}`).then((response)=>{
      if(response.status === 'Ok'){
        this.updateBhMainChartList()
      }else{
        console.log("main chart list remove unsuccessfully")
      }
    })
  }


  projectSelectHandler(pid){
    let selectedProject = this.config[pid] 
    this.setState({selectedProject: selectedProject})
  }

  updateTableColumnAndCountername(tablename){
    console.log(`SELECT name , type FROM pragma_table_info("${tablename}")`)
    let project = (new Database()).query(`SELECT name , type FROM pragma_table_info("${tablename}")`).then((response)=>{
      if(response.status === 'Ok'){
        let selectedTableColDefs = response.result.map(column  => ({headerName: column.name, field: column.name}))
        let counterName = response.result.filter(column => column.type !== 'DATE' && column.type !== 'TEXT' && column.name !== 'ID')
        this.setState({
          selectedTableColDefs: selectedTableColDefs,
          counterName:counterName
        })
      }else{
        console.log(response)
      }
    })
  }

  render(){
    const {
      uploading_count,
      uploading,
      removingDuplicated,
      removingAll,
      selectedProject, 
      counterName,
      kpiList,
      mrlayerseries,
      mrlayerlist,
      mrmainseries,
      mrmainlist,
      snack,
      updateAvailable,
      updateDownloaded,
    } = this.state

    const disabled = removingDuplicated || uploading || removingAll
    return (
      <div className="App">
        <Card className="card-section">
          <Card.Header>Database</Card.Header>
          <Card.Body>
            <div className="database-control-wrap">
              <div className="database-control">
                <Button onClick={()=>{this.selectFile()}} disabled={disabled}>
                  {uploading && <Spinner
                    as="span"
                    animation="grow"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />}
                  <div>
                    {uploading && "Uploading"}
                    {!uploading && "Upload Stats"}
                  </div>
                </Button>      
                <div>
                  {uploading_count}
                </div>
              </div>
              
              <div className="database-control">
                <Delete 
                  action={()=>{this.removeAllRawData()}} 
                  confirmText="Delete all raw data from database.">
                  <Button disabled={disabled}>
                    {removingAll && <Spinner 
                      as="span"
                      animation="grow"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />}
                    <div>Clear Raw Data</div>
                  </Button>
                </Delete>
              </div>

              <div className="database-control">
                <Button onClick={()=>{this.removeDuplicated()}} disabled={disabled}>
                  {removingDuplicated && <Spinner 
                    as="span"
                    animation="grow"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />}
                  <div>Delete Duplicated</div>
                </Button>
              </div>

              <div className="database-control">
                <Button onClick={()=>{this.linkDatabase()}} disabled={disabled}>
                  Link Database
                </Button>
              </div>

              <div className="database-control">
                <Delete 
                  action={()=>{}} 
                  confirmText="Reset will remove all the setting including KPIs, Charts and raw data">
                  <Button disabled={disabled}>Reset</Button>
                </Delete>
              </div>
              
              <div className="database-control">
                <Button onClick={()=>{this.whereismydb()}}>
                  Where is my database?
                </Button>
              </div>
            </div>
            
            
          </Card.Body>
        </Card>
          
        <Card className="card-section">
          <Card.Header>KPI</Card.Header>
          <Card.Body>
            <div style={{display:'flex'}}>
              <div className="ag-theme-balham" style={{width:'220px', height: '210px'}}>
                <AgGridReact 
                  columnDefs={[{headerName:'Counter Name', field:'name', resizable:true}]}
                  modules={AllCommunityModules}
                  rowData={
                    counterName
                  }
                  enableCellTextSelection={true}
                /> 
              </div>

              <div style={{flexGrow: 1, paddingLeft: "10px"}}>
                <Form onSubmit={this.handleKpiSubmit}>
                  <Form.Group controlId="form-kpi-name">
                    <Form.Label>KPI Name</Form.Label>
                    <Form.Control required type="text" placeholder="Enter KPI Name" />
                  </Form.Group>

                  <Form.Group controlId="form-kpi-formula">
                    <Form.Label>KPI Formula</Form.Label>
                    <Form.Control required type="text" placeholder="Enter KPI Fomrula"/>
                  </Form.Group>

                  <Button variant="primary" type="submit" disabled={disabled}>
                    Insert
                  </Button>
                </Form>
              </div>

            </div>

            <div>
              <Table size="sm" style={{marginTop: '10px'}}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Formula</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {kpiList.map((kpi,kpiid) => {
                    return (
                      <tr key={kpi.ID}>
                        <td>{kpiid+1}</td>
                        <td>{kpi.name}</td>
                        <td>{kpi.formula}</td>
                        <td>
                          <Delete action={()=>this.deleteKpiFormula(kpi.ID)}/>
                        </td>
                      </tr>
                      )
                  })}
                </tbody>
              </Table>
            </div>
            
          </Card.Body>
        </Card>

        <Card className="card-section">
          <Card.Header>
            KPI Graph
          </Card.Header>
          <Card.Body>
            <Button variant="secondary" onClick={()=>{this.setState({kpiGraphDialog:true})}}  disabled={disabled}>Query KPI Graph</Button>

            <div style={{marginTop:"30px",borderTop:"1px solid #cecece", paddingTop:"10px"}}>
              <h4>BH Layer Graph</h4>
              <Form onSubmit={this.addBhLayerChartHandler} style={{marginBottom:"10px"}}>

                <Form.Row>
                  <Form.Group as={Col} controlId="form-graph-bh-layer-title">
                    <Form.Label>Graph Title</Form.Label>
                    <Form.Control required type="text" placeholder="Enter graph title"></Form.Control>
                  </Form.Group>
                  <Form.Group as={Col}>
                    <Form.Label>Graph Series</Form.Label>
                    <Dropdown>
                      <Dropdown.Toggle variant="light">{kpiList[mrlayerseries] ? kpiList[mrlayerseries].name : 'Select series'}</Dropdown.Toggle>
                      <Dropdown.Menu>
                        {kpiList.map((kpi, kpiid)=>{
                          return <Dropdown.Item key={kpi.ID} eventKey={kpiid} onSelect={(evtKey)=>{this.setState({mrlayerseries:evtKey})}}>{kpi.name}</Dropdown.Item>
                        })}
                      </Dropdown.Menu>
                    </Dropdown>
                  </Form.Group>
                </Form.Row> 
                
                <Button type="submit"  disabled={disabled}>Add</Button>
              </Form>
              <Table size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Graph Title</th>
                    <th>Graph Series</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mrlayerlist.map((mrlayer, mrlayerid)=>{
                    return (
                      <tr key={mrlayerid}>
                        <td>{mrlayerid+1}</td>
                        <td>{mrlayer.title}</td>
                        <td>{mrlayer.seriesname}</td>
                        <td><Delete action={()=>{this.deleteLayerChartList(mrlayer.ID)}}/></td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
              
            </div>
            <div style={{marginTop:"30px",borderTop:"1px solid #cecece", paddingTop:"10px"}}>
              <h4>BH Main KPI Graph</h4>
              <Form onSubmit={this.addBhMainChartHandler} style={{marginBottom:"10px"}}>
                <Form.Row>

                  <Form.Group as={Col} controlId="form-graph-bh-main-title">
                    <Form.Label>Graph Title</Form.Label>
                    <Form.Control required type="text" placeholder="Enter graph title"></Form.Control>
                  </Form.Group>
                  <Form.Group as={Col} controlId="form-graph-bh-main-series">
                    <Form.Label>Graph Series</Form.Label>
                    <Dropdown>
                      <Dropdown.Toggle variant="light">{kpiList[mrmainseries] ? kpiList[mrmainseries].name : 'Select series'}</Dropdown.Toggle>
                      <Dropdown.Menu>
                        {kpiList.map((kpi,kpiid)=>{
                          return <Dropdown.Item key={kpi.ID} eventKey={kpiid} onSelect={(evtKey)=>{this.setState({mrmainseries:evtKey})}}>{kpi.name}</Dropdown.Item>
                        })}
                      </Dropdown.Menu>
                    </Dropdown>
                  </Form.Group>
                </Form.Row>

                <Form.Row>
                  <Form.Group as={Col} controlId="form-graph-bh-main-baseline-title">
                    <Form.Label>Baseline Title</Form.Label>
                    <Form.Control type="text" placeholder="Baseline Title"></Form.Control>
                  </Form.Group>
                  <Form.Group as={Col}  controlId="form-graph-bh-main-baseline-value">
                    <Form.Label>Baseline Value</Form.Label>
                    <Form.Control type="text" placeholder="Baseline Value"></Form.Control>
                  </Form.Group>
                </Form.Row>
                
                <Button type="submit"  disabled={disabled}>Add</Button>
              </Form>
              <Table size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Graph Title</th>
                    <th>Graph Series</th>
                    <th>Baseline Title</th>
                    <th>Baseline Value</th>
                    <th></th>
                  </tr>
                  
                </thead>
                <tbody>
                  {mrmainlist.map((mrmain, mrmainid)=>{
                    return (
                      <tr key={mrmainid}>
                        <td>{mrmainid+1}</td>
                        <td>{mrmain.title}</td>
                        <td>{mrmain.seriesname}</td>
                        <td>{mrmain.baselinetitle}</td>
                        <td>{mrmain.baselinevalue}</td>
                        <td><Delete action={()=>{this.deleteMainChartList(mrmain.ID)}} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
        
        <Modal centered onHide={this.handleKpiGraphClose} show={this.state.kpiGraphDialog} dialogClassName="mrchartdialog">
          <Modal.Header>KPI Graph</Modal.Header>
          <Modal.Body>
            <KpiGraph mrlayerlist={mrlayerlist} project={selectedProject} mrmainlist={mrmainlist} />
          </Modal.Body>
        </Modal>

        <Snackbar 
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left'
          }}
          open={snack.open}
          autoHideDuration={6000}
          onClose={this.handleSnackClose}
          message={<span id="message-id">{snack.message}</span>}
        />

        <Snackbar 
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
          }}
          open={updateAvailable}
          onClose={this.handleSnackUpdateClose}
          message={<span id="message-id">Update available</span>}
          action={[
            <Button variant="secondary" size="small" onClick={()=>{this.downloadUpdate()}}>
              Download
            </Button>,
            <IconButton
              key="close"
              aria-label="close"
              color="inherit"
              onClick={this.handleSnackUpdateClose}
            >
              <CloseIcon />
            </IconButton>,
          ]}
        />

        <Snackbar 
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
          }}
          open={updateDownloaded}
          onClose={this.handleSnackUpdateDownloadedClose}
          message={<span id="message-id">Update downloaded, restart to install.</span>}
          action={[
            <Button variant="secondary" size="small" onClick={()=>{this.installUpdate()}}>
              Restart
            </Button>,
            <IconButton
              key="close"
              aria-label="close"
              color="inherit"
              onClick={this.handleSnackUpdateDownloadedClose}
            >
              <CloseIcon />
            </IconButton>,
          ]}
        />
      </div>
    );
  } 
}

export default App;
