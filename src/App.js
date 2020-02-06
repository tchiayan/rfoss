import React from 'react';
import './App.css';
//import { ipcRenderer } from  'electron';
import { Button , Dropdown , Card  , Form, Table , Col , Modal , Spinner } from "react-bootstrap";
//import { ReactComponent as Cancel } from './Cancel.svg'
import { Snackbar , IconButton } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';

import KpiGraph from './KpiGraph';
import TaTable from './TaTable';
import Hotspot from './Hotspot';

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

class ShowMore extends React.Component{
  constructor(props){
    super(props)
    this.state = {
      show: false
    }
  }
  
  render(){
    const {
      children
    } = this.props

    const {
      show
    } = this.state

    return (
      <div>
        <div style={{height:show?'auto':'0px', display: show?'block':'none', opacity: show?1:0}} className="animate-height">
          {children}
        </div>
        <div style={{widht:'100%', borderTop:'1px solid gray', marginTop:'10px', display:'flex', justifyContent:'center'}}>
          <div style={{cursor:'pointer'}} onClick={()=>{this.setState({show:!this.state.show})}}>{show?'Hide':'Show More'}</div>
        </div>
      </div>
   )
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
      bisectorseries: 0,
      bisectorlist: [],
      tatableseries: 0,
      tatablelist: [],
      tagraphseries: 0,
      tagraphlist: [],
      hotspotDialog: false,
      taTableDialog: false,
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
    this.handleKpiGraphClose = this.handleKpiGraphClose.bind(this)
    this.addBhLayerChartHandler = this.addBhLayerChartHandler.bind(this)
    this.addBhMainChartHandler = this.addBhMainChartHandler.bind(this)
    this.addBiSectorChartHandler = this.addBiSectorChartHandler.bind(this)
    this.addTaTableHandler = this.addTaTableHandler.bind(this)
    this.addTaGraphHandler = this.addTaGraphHandler.bind(this)
    this.handleTaTableCLose = this.handleTaTableCLose.bind(this)
    this.handleHotspotClose = this.handleHotspotClose.bind(this)
    this.handleSnackClose = this.handleSnackClose.bind(this)
    this.handleSnackMessage = this.handleSnackMessage.bind(this)
    this.handleSnackUpdateClose = this.handleSnackUpdateClose.bind(this)
    this.handleSnackUpdateDownloadedClose = this.handleSnackUpdateDownloadedClose.bind(this)
  }

  handleSnackMessage(message){
    let snack = this.state.snack
    snack.open = true;
    snack.message = message;
    this.setState({snack:snack})
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

  handleTaTableCLose(){
    this.setState({taTableDialog:false})
  }

  handleHotspotClose(){
    this.setState({hotspotDialog:false})
  }

  async resetBiSectorList(){
    const kpiList = this.state.kpiList 

    const defaultConfig = [
      {
        title: 'DL User Throughput(Mbps)',
        series: "DL User Throughput(Mbps)",
      },
      {
        title: 'Avg No. of user',
        series: "Avg No. of user",
      },
      {
        title: 'PRB DL (%)',
        series: "PRB DL (%)",
      },
      {
        title: 'Ave CQI',
        series: "Ave CQI",
      }
    ]

    let dbOp = new Database()
    dbOp.delete("DELETE FROM bisectorchart").then(async (response)=>{
      let error = false
      for(let i=0; i < defaultConfig.length ; i++){
        let config = defaultConfig[i]
        let db = new Database()
        const seriesInfo = kpiList.find(entry => entry.name === config.series)
        if(!seriesInfo){
          error = true 
        }else{
          let query = `INSERT INTO bisectorchart ( title , seriesid , seriesname , seriesformula , table_stats ) VALUES ( '${config.title}' , ${seriesInfo.ID} , '${seriesInfo.name}' , '${seriesInfo.formula}', '${this.config[0].tablename}')`
          let response = await db.update(query)
          if(response.status !== "Ok"){
            error = true
          }
        }
      }

      if(error){
        this.handleSnackMessage("Unable to reset all Bisector chart series due to missing KPI, consider resetting KPI  first")
      }else{
        this.handleSnackMessage("Reset Bisector Chart successfully")
      }

    }).finally(()=>{
      this.updateBiSectorChartList()
    })
  }

  async resetTaTableList(){
    const kpiList = this.state.kpiList 

    const defaultConfig = [
      {
        title: '(0-78m)',
        series: "TA (0-78m)%"
      },{
        title: '(78m-234m)',
        series: "TA (78m-234m)%"
      },{
        title: '(234m-546m)',
        series: "TA (234m-546m)%"
      },{
        title: '(546m-1014m)',
        series: "TA (546m-1014m)%"
      },{
        title: '(1014m-1950m)',
        series: "TA (1014m-1950m)%"
      },{
        title: '(1950m-3510m)',
        series: "TA (1950m-3510m)%"
      },{
        title: '(3510m-6630m)',
        series: "TA (3510m-6630m)%"
      },{
        title: '(6630m-14430m)',
        series: "TA (6630m-14430m)%"
      },{
        title: '(14430m-30030m)',
        series: "TA (14430m-30030m)%"
      },{
        title: '(30030m-53430m)',
        series: "TA (30030m-53430m)%"
      },{
        title: '(53430m-76830m)',
        series: "TA (53430m-76830m)%"
      },{
        title: '(>76830m)',
        series: "TA (>76830m)%"
      }
    ]

    let dbOp = new Database()
    dbOp.delete("DELETE FROM tatable").then(async (response)=>{
      let error = false
      for(let i=0; i < defaultConfig.length ; i++){
        let config = defaultConfig[i]
        let db = new Database()
        const seriesInfo = kpiList.find(entry => entry.name === config.series)
        if(!seriesInfo){
          error = true 
        }else{
          let query = `INSERT INTO tatable ( title , seriesid , seriesname, seriesformula , table_stats ) VALUES ('${config.title}' , ${seriesInfo.ID} , '${seriesInfo.name}', '${seriesInfo.formula}' , '${this.config[0].tablename}') `
          let response = await db.update(query)
          if(response.status !== "Ok"){
            error = true
          }
        }
      }

      if(error){
        this.handleSnackMessage("Unable to reset all TA table due to missing KPI, consider resetting KPI  first")
      }else{
        this.handleSnackMessage("Reset TA Table successfully")
      }

      this.updateTaTableList()
    })
    
  }

  async resetTaGraphList(){
    const kpiList = this.state.kpiList 

    const defaultConfig = [
      {
        title: '(0-78m)',
        series: "TA (0-78m)"
      },{
        title: '(78m-234m)',
        series: "TA (78m-234m)"
      },{
        title: '(234m-546m)',
        series: "TA (234m-546m)"
      },{
        title: '(546m-1014m)',
        series: "TA (546m-1014m)"
      },{
        title: '(1014m-1950m)',
        series: "TA (1014m-1950m)"
      },{
        title: '(1950m-3510m)',
        series: "TA (1950m-3510m)"
      },{
        title: '(3510m-6630m)',
        series: "TA (3510m-6630m)"
      },{
        title: '(6630m-14430m)',
        series: "TA (6630m-14430m)"
      },{
        title: '(14430m-30030m)',
        series: "TA (14430m-30030m)"
      },{
        title: '(30030m-53430m)',
        series: "TA (30030m-53430m)"
      },{
        title: '(53430m-76830m)',
        series: "TA (53430m-76830m)"
      },{
        title: '(>76830m)',
        series: "TA (>76830m)"
      }
    ]

    let dbOp = new Database()
    dbOp.delete("DELETE FROM tagraph").then(async (response)=>{
      let error = false
      for(let i=0; i < defaultConfig.length ; i++){
        let config = defaultConfig[i]
        let db = new Database()
        const seriesInfo = kpiList.find(entry => entry.name === config.series)
        if(!seriesInfo){
          error = true 
        }else{
          let query = `INSERT INTO tagraph ( title , seriesid , seriesname, seriesformula , table_stats ) VALUES ('${config.title}' , ${seriesInfo.ID} , '${seriesInfo.name}', '${seriesInfo.formula}' , '${this.config[0].tablename}') `
          let response = await db.update(query)
          if(response.status !== "Ok"){
            error = true
          }
        }
      }

      if(error){
        this.handleSnackMessage("Unable to reset all TA graph due to missing KPI, consider resetting KPI  first")
      }else{
        this.handleSnackMessage("Reset TA graph successfully")
      }

      this.updateTaGraphList()
    })
    
  }

  resetBhMainChart(){
    const kpiList = this.state.kpiList 
    const defaultConfig = [
      {
        title: "CSSR",
        series: "CSSR",
        baselinetitle: "CSSR Baseline",
        baselinevalue: 95
      },{
        title: "DCR",
        series: "DCR",
        baselinetitle: "DCR Baseline",
        baselinevalue: 2.5
      },{
        title: "HOSR",
        series: "HOSR",
        baselinetitle: "HOSR Baseline",
        baselinevalue: 97
      },{
        title: "CSFB SR",
        series: "CSFB SR",
        baselinetitle: "CSFB Baseline",
        baselinevalue: 98.5
      },{
        title: "Avg UL Interference(dBm)",
        series: "Avg UL Interference(dBm)",
        baselinetitle: null, 
        baselinevalue: null
      }
    ]

    let dbOp = new Database()
    dbOp.delete("DELETE FROM mrmainchart").then((response)=>{
      if(response.status === "Ok"){
        let createDefaultBhMainChart = defaultConfig.map(config => {
          const seriesInfo = kpiList.find(entry => entry.name === config.series)
          if(!seriesInfo){
            return new Promise((resolve, reject)=> {reject("Unable to create BH main Graph due to missing KPI, consider reseting KPI first")})
          }else{
            let db = new Database()
            let query = `INSERT INTO mrmainchart ( title , seriesid, seriesname , seriesformula, baselinetitle, baselinevalue , table_stats) VALUES ( '${config.title}' , ${seriesInfo.ID} , '${seriesInfo.name}', '${seriesInfo.formula}' , ${config.baselinetitle===null?null:`'${config.baselinetitle}'`} , ${config.baselinevalue} , '${this.config[0].tablename}') `
            return db.update(query)
          }
        })
    
        Promise.all(createDefaultBhMainChart).then((response)=>{
          console.log(response)
          this.handleSnackMessage("Reset BH Main Graph successfully")
        }).catch((error)=>{
          console.log(error)
          this.handleSnackMessage("Unable to reset all BH main graph due to missing KPI, consider resetting KPI  first")
        }).finally(()=>{
          this.updateBhMainChartList()
        })
      }else{
        console.log('reset error')
      }
    })
    
  }

  async resetBhLayerChart(){
    const kpiList = this.state.kpiList

    const defaultConfig = [
      {
        title: 'DL User Throughput(Mbps)',
        series: "DL User Throughput(Mbps)",
      },{
        title: 'Avg No. of user',
        series: "Avg No. of user",
      },{
        title: 'PRB DL (%)',
        series: "PRB DL (%)",
      },{
        title: 'Ave CQI',
        series: "Ave CQI",
      },{
        title: "PDSCH IBLER", 
        series: "PDSCH IBLER"
      },{
        title: 'DL.CAUser.Traffic(GB)',
        series: "DL.CAUser.Traffic(GB)",
      },{
        title: 'DL Max Throughput(Mbps)',
        series: "DL Max Throughput(Mbps)",
      },{
        title: 'L.Traffic.User.PCell.DL.Avg',
        series: "L.Traffic.User.PCell.DL.Avg",
      },{
        title: 'L.Traffic.User.SCell.DL.Avg',
        series: "L.Traffic.User.SCell.DL.Avg",
      },{
        title: 'Total DL Traffic Volume(GB)',
        series: "Total DL Traffic Volume(GB)",
      },{
        title: "DL Edge User TP (Mbps)", 
        series: "DL Edge User TP (Mbps)"
      },
    ]

    let dbOp = new Database()
    dbOp.delete("DELETE FROM mrlayerchart").then(async (response)=>{
      let error = false
      for(let i=0; i < defaultConfig.length ; i++){
        let config = defaultConfig[i]
        let db = new Database()
        const seriesInfo = kpiList.find(entry => entry.name === config.series)
        if(!seriesInfo){
          error = true 
        }else{
          let query = `INSERT INTO mrlayerchart ( title , seriesid , seriesname , seriesformula , table_stats ) VALUES ( '${config.title}' , ${seriesInfo.ID} , '${seriesInfo.name}' , '${seriesInfo.formula}', '${this.config[0].tablename}')`
          let response = await db.update(query)
          if(response.status !== "Ok"){
            error = true
          }
        }
      }

      if(error){
        this.handleSnackMessage("Unable to create BH Layer Graph due to missing KPI, consider reseting KPI first")
      }else{
        this.handleSnackMessage("Reset BH Layer Graph successfull")
      }

      this.updateBhLayerChartList()
    })
    
  }

  async resetKpiList(){

    const defaultConfig = [
      {
        name: "DL User Throughput(Mbps)",
        formula: "avg(DL_User_Average_Throughput_Mbps)",
        counter:["DL_User_Average_Throughput_Mbps"]
      },{
        name: "DL Max Throughput(Mbps)",
        formula: "avg(Cell_DL_Max_ThroughputtoPDCP_Mbps)",
        counter:["Cell_DL_Max_ThroughputtoPDCP_Mbps"]
      },{
        name: "Total DL Traffic Volume(GB)",
        formula: "avg(Total_DL_Traffic_Volume_GB)",
        counter:["Total_DL_Traffic_Volume_GB"]
      },{
        name: "Avg No. of user",
        formula: "avg(Avg_No_of_user_number)",
        counter: ["Avg_No_of_user_number"]
      },{
        name: "PRB DL (%)",
        formula: "avg(PRB_Usage_DL)",
        counter:["PRB_Usage_DL"]
      },{
        name: "DL.CAUser.Traffic(GB)",
        formula: "avg(DL_CAUser_Traffic_GB)",
        counter: ["DL_CAUser_Traffic_GB"]
      },{
        name: "Ave CQI",
        formula: "avg(CQI_Avg)",
        counter: ["CQI_Avg"]
      },{
        name: "L.Traffic.User.PCell.DL.Avg",
        formula: "avg(L_Traffic_User_PCell_DL_Avg)",
        counter: ["L_Traffic_User_PCell_DL_Avg"]
      },{
        name: "L.Traffic.User.SCell.DL.Avg",
        formula: "avg(L_Traffic_User_SCell_DL_Avg)",
        counter: ["L_Traffic_User_SCell_DL_Avg"]
      },{
        name: "PDSCH IBLER", 
        formula: "avg(PDSCH_IBLER)",
        counter: ["PDSCH_IBLER"]
      },{
        name: "DL Edge User TP (Mbps)", 
        formula: "avg(M_DL_Edge_User_Throughput_Mbps)",
        counter: ["M_DL_Edge_User_Throughput_Mbps"]
      },{
        name: "DCR",
        formula: "avg(ERAB_DCR_MME)",
        counter: ["ERAB_DCR_MME"]
      },{
        name: "HOSR",
        formula: "avg(HO_Success_Rate)",
        counter: ["HO_Success_Rate"]
      },{
        name: "CSFB SR",
        formula: "avg(CSFB_Preparation_Success_Rate)",
        counter: ["CSFB_Preparation_Success_Rate"]
      },{
        name: "Avg UL Interference(dBm)",
        formula: "avg(Avg_UL_Interference_dBm)",
        counter: ["Avg_UL_Interference_dBm"]
      },{
        name: "CSSR",
        formula: "avg(CSSR)",
        counter: ["CSSR"]
      },{
        name: "TA (0-78m)%",
        formula: "100*sum(L_RA_TA_UE_Index0)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index0','L_RA_TA_UE_0to11']
      },{
        name: "TA (78m-234m)%",
        formula: "100*sum(L_RA_TA_UE_Index1)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index1','L_RA_TA_UE_0to11']
      },{
        name: "TA (234m-546m)%",
        formula: "100*sum(L_RA_TA_UE_Index2)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index2','L_RA_TA_UE_0to11']
      },{
        name: "TA (546m-1014m)%",
        formula: "100*sum(L_RA_TA_UE_Index3)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index3','L_RA_TA_UE_0to11']
      },{
        name: "TA (1014m-1950m)%",
        formula: "100*sum(L_RA_TA_UE_Index4)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index4','L_RA_TA_UE_0to11']
      },{
        name: "TA (1950m-3510m)%",
        formula: "100*sum(L_RA_TA_UE_Index5)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index5','L_RA_TA_UE_0to11']
      },{
        name: "TA (3510m-6630m)%",
        formula: "100*sum(L_RA_TA_UE_Index6)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index6','L_RA_TA_UE_0to11']
      },{
        name: "TA (6630m-14430m)%",
        formula: "100*sum(L_RA_TA_UE_Index7)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index7','L_RA_TA_UE_0to11']
      },{
        name: "TA (14430m-30030m)%",
        formula: "100*sum(L_RA_TA_UE_Index8)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index8','L_RA_TA_UE_0to11']
      },{
        name: "TA (30030m-53430m)%",
        formula: "100*sum(L_RA_TA_UE_Index9)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index9','L_RA_TA_UE_0to11']
      },{
        name: "TA (53430m-76830m)%",
        formula: "100*sum(L_RA_TA_UE_Index10)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index10','L_RA_TA_UE_0to11']
      },{
        name: "TA (>76830m)%",
        formula: "100*sum(L_RA_TA_UE_Index11)/sum(L_RA_TA_UE_0to11)",
        counter: ['L_RA_TA_UE_Index11','L_RA_TA_UE_0to11']
      },{
        name: "TA (0-78m)",
        formula: "sum(L_RA_TA_UE_Index0)",
        counter: ['L_RA_TA_UE_Index0']
      },{
        name: "TA (78m-234m)",
        formula: "sum(L_RA_TA_UE_Index1)",
        counter: ['L_RA_TA_UE_Index1']
      },{
        name: "TA (234m-546m)",
        formula: "sum(L_RA_TA_UE_Index2)",
        counter: ['L_RA_TA_UE_Index2']
      },{
        name: "TA (546m-1014m)",
        formula: "sum(L_RA_TA_UE_Index3)",
        counter: ['L_RA_TA_UE_Index3']
      },{
        name: "TA (1014m-1950m)",
        formula: "sum(L_RA_TA_UE_Index4)",
        counter: ['L_RA_TA_UE_Index4']
      },{
        name: "TA (1950m-3510m)",
        formula: "sum(L_RA_TA_UE_Index5)",
        counter: ['L_RA_TA_UE_Index5']
      },{
        name: "TA (3510m-6630m)",
        formula: "sum(L_RA_TA_UE_Index6)",
        counter: ['L_RA_TA_UE_Index6']
      },{
        name: "TA (6630m-14430m)",
        formula: "sum(L_RA_TA_UE_Index7)",
        counter: ['L_RA_TA_UE_Index7']
      },{
        name: "TA (14430m-30030m)",
        formula: "sum(L_RA_TA_UE_Index8)",
        counter: ['L_RA_TA_UE_Index8']
      },{
        name: "TA (30030m-53430m)",
        formula: "sum(L_RA_TA_UE_Index9)",
        counter: ['L_RA_TA_UE_Index9']
      },{
        name: "TA (53430m-76830m)",
        formula: "sum(L_RA_TA_UE_Index10)",
        counter: ['L_RA_TA_UE_Index10']
      },{
        name: "TA (>76830m)",
        formula: "sum(L_RA_TA_UE_Index11)",
        counter: ['L_RA_TA_UE_Index11']
      }
    ]

    const counters = this.state.counterName.slice().map(entry => entry.name)

    if(counters.length === 0){
      this.handleSnackMessage("Empty database. Please upload the raw data into database first")
      return
    }

    let dbOp = new Database()
    dbOp.delete("DELETE FROM formulas").then(async (response)=>{
      let error = false
      for(let i=0; i < defaultConfig.length ; i++){
        let config = defaultConfig[i]
        let _counterExist = config.counter.map(_counter => counters.includes(_counter))
        if(_counterExist.includes(false)){
          error = true
          console.log(`Fail to create KPI ${config.name} due to missing counter`)
          break;
        }
        let db = new Database()
        let query = `INSERT INTO formulas ( name , formula , table_stats ) VALUES ( '${config.name}' , '${config.formula}' , '${this.config[0].tablename}')`
        let response = await db.update(query)
        if(response.status !== "Ok"){
          error = true
        }
      }

      if(error){
        this.handleSnackMessage("Fail to create some KPI due to missing columns from MR stats.")
      }else{
        this.handleSnackMessage("KPI reset successfully")
      }

      this.updateKpiList(this.state.selectedProject.tablename)
    })
    
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
    formula = formula.replace(/([a-z|A-Z]\w+)/gi, "C.$1")

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
      console.log(formula)
      this.handleSnackMessage("Incorrect formula")
    }
  }

  addBhLayerChartHandler(event){
    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget;
    const layerTitle = form.querySelector("#form-graph-bh-layer-title").value 
    const seriesInfo = this.state.kpiList[this.state.mrlayerseries]

    let db = new Database()
    db.update(`INSERT INTO mrlayerchart ( title , seriesid , seriesname , seriesformula , table_stats ) VALUES ( '${layerTitle}' , ${seriesInfo.ID} , '${seriesInfo.name}' , '${seriesInfo.formula}', '${this.config[0].tablename}')`).then((response)=>{
      if(response.status === 'Ok'){
        this.updateBhLayerChartList()
      }
    })
  }

  addBiSectorChartHandler(event){
    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget;
    const layerTitle = form.querySelector("#form-graph-bisector-title").value 
    const seriesInfo = this.state.kpiList[this.state.bisectorseries]
    let db = new Database()
    db.update(`INSERT INTO bisectorchart ( title , seriesid , seriesname , seriesformula , table_stats ) VALUES ( '${layerTitle}' , ${seriesInfo.ID} , '${seriesInfo.name}' , '${seriesInfo.formula}', '${this.config[0].tablename}')`).then((response)=>{
      if(response.status === 'Ok'){
        this.updateBhLayerChartList()
      }
    })
  }

  addTaTableHandler(event){
    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget;
    const title = form.querySelector("#form-table-ta-title").value 
    const seriesInfo = this.state.kpiList[this.state.tatableseries]

    let db = new Database()
    db.update(`INSERT INTO tatable (title , seriesid , seriesname, seriesformula, table_stats ) VALUES ( '${title}' , ${seriesInfo.ID} , '${seriesInfo.name}' , '${seriesInfo.formula}', '${this.config[0].tablename}' ) `).then((response)=>{
      if(response.status === "Ok"){
        this.updateTaTableList()
      }
    })
  }

  addTaGraphHandler(event){
    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget;
    const title = form.querySelector("#form-graph-ta-title").value
    const seriesInfo = this.state.kpiList.slice()[this.state.tagraphseries]

    let db = new Database()
    db.update(`INSERT INTO tagraph (title, seriesid , seriesname, seriesformula, table_stats )  VALUES ( '${title}' , ${seriesInfo.ID} , '${seriesInfo.name}' , '${seriesInfo.formula}', '${this.config[0].tablename}' ) `).then((response)=>{
      if(response.status === "Ok"){
        this.updateTaGraphList()
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
      seriesformula : `'${seriesInfo.formula}'`,
      table_stats: `'${this.config[0].tablename}'`
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

  queryCellObject(){
    let db = new Database();
    db.query('SELECT DISINCT cellname')
  }

  initDb(){
    let db = new Database()
    db.mainDb(this.config[0].tablename, ()=>{
      this.setState({databaseReady: true})
      this.updateTableColumnAndCountername(this.config[0].tablename)
    })
    
    db.createTableIfNotAssist('mrlayerchart', 'CREATE TABLE mrlayerchart (ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL , title TEXT, seriesid INTEGER NOT NULL, seriesname TEXT NOT NULL, seriesformula TEXT NOT NULL, table_stats TEXT NOT NULL)').then(()=>{
      return db.createTableIfNotAssist('mrmainchart', 'CREATE TABLE mrmainchart (ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL , title TEXT, seriesid INTEGER NOT NULL, seriesname TEXT NOT NULL, seriesformula TEXT NOT NULL, baselinetitle TEXT, baselinevalue REAL, table_stats TEXT NOT NULL)')
    }).then(()=>{
      return db.createTableIfNotAssist('bisectorchart',"CREATE TABLE bisectorchart (ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL , title TEXT, seriesid INTEGER NOT NULL, seriesname TEXT NOT NULL, seriesformula TEXT NOT NULL, table_stats TEXT NOT NULL)")
    }).then(()=>{
      return db.createTableIfNotAssist('formulas',"CREATE TABLE formulas (ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL, name TEXT NOT NULL, formula TEXT NOT NULL, table_stats TEXT NOT NULL )")
    }).then(()=>{
      return db.createTableIfNotAssist('tatable',"CREATE TABLE tatable (ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL, title TEXT, seriesid INTEGER NOT NULL, seriesname TEXT NOT NULL, seriesformula TEXT NOT NULL, table_stats TEXT NOT NULL) ")
    }).then(()=>{
      return db.createTableIfNotAssist('tagraph',"CREATE TABLE tagraph (ID INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL, title TEXT, seriesid INTEGER NOT NULL, seriesname TEXT NOT NULL, seriesformula TEXT NOT NULL, table_stats TEXT NOT NULL) ")
    }).then(()=>{
      this.updateKpiList(this.config[0].tablename)
      this.updateBhLayerChartList()
      this.updateBiSectorChartList()
      this.updateBhMainChartList()
      this.updateTaTableList()
      this.updateTaGraphList()
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
      this.updateTableColumnAndCountername(this.config[0].tablename)
    })
  }

  removeDuplicated(){
    this.setState({removingDuplicated: true})
    let db = new Database()
    db.run(`DELETE FROM ${this.config[0].tablename} WHERE ID NOT IN ( SELECT MIN(ID) FROM ${this.config[0].tablename} GROUP BY [Cell_Name], date([Date]))`).then((response)=>{
      if(response.status === 'Ok'){
        this.handleSnackMessage(`Duplicate row [${response.affectedRows}] deleted`)
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
        response.result.sort((a,b)=> {
          if(a.name>b.name) return 1
          if(a.name<b.name) return -1
          return 0
        })
        this.setState({kpiList: response.result})
      }else{
        console.log("Update kpi list unsuccessfully")
      }
    })
  }

  updateBhLayerChartList(){
    let db = new Database()
    db.query(`SELECT ID, title , seriesname, seriesformula FROM mrlayerchart WHERE table_stats = '${this.config[0].tablename}'`).then((response)=>{
      if(response.status === 'Ok'){
        this.setState({mrlayerlist: response.result})
      }else{
        console.log("Update kpi list unsuccessfully")
      }
    })
  }

  updateBiSectorChartList(){
    let db = new Database()
    db.query(`SELECT ID, title , seriesname, seriesformula FROM bisectorchart WHERE table_stats = '${this.config[0].tablename}'`).then((response)=>{
      if(response.status === 'Ok'){
        this.setState({bisectorlist: response.result})
      }else{
        console.log("Update kpi list unsuccessfully")
      }
    })
  }

  updateBhMainChartList(){
    let db = new Database()
    db.query(`SELECT ID, title , seriesname, seriesformula, baselinetitle, baselinevalue FROM mrmainchart WHERE table_stats = '${this.config[0].tablename}'`).then((response)=>{
      if(response.status === 'Ok'){
        this.setState({mrmainlist: response.result})
      }else{
        console.log("Update kpi list unsuccessfully")
      }
    })
  }

  updateTaTableList(){
    let db = new Database()
    db.query(`SELECT ID, title, seriesname, seriesformula FROM tatable WHERE table_stats = '${this.config[0].tablename}'`).then((response)=>{
      if(response.status === "Ok"){
        this.setState({tatablelist: response.result})
      }else{
        console.log("Update TA table list unsucessfully")
      }
    })
  }

  updateTaGraphList(){
    let db = new Database()
    db.query(`SELECT ID, title, seriesname, seriesformula FROM tagraph WHERE table_stats = '${this.config[0].tablename}' `).then((response)=>{
      if(response.status === "Ok"){
        this.setState({tagraphlist: response.result})
      }else{
        console.log("Update TA graph list unsuccessfully")
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

  deleteBisectorChartList(id){
    let db = new Database()
    db.delete(`DELETE FROM bisectorchart WHERE ID = ${id}`).then((response)=>{
      if(response.status === 'Ok'){
        this.updateBiSectorChartList()
      }else{
        console.log("bisector chart list remove unsuccessfully")
      }
    })
  }

  deleteTaTableList(id){
    let db = new Database()
    db.delete(`DELETE FROM tatable WHERE ID = ${id}`).then((response)=>{
      if(response.status === "Ok"){
        this.updateTaTableList()
      }else{
        console.log("ta table list remove unsuccessfully")
      }
    })
  }

  deleteTaGraphList(id){
    let db = new Database()
    db.delete(`DELETE FROM tagraph WHERE ID = ${id}`).then((response)=>{
      if(response.status === "Ok"){
        this.updateTaGraphList()
      }else{
        console.log("ta graph list remove unsuccessfully")
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
    //console.log(`SELECT name , type FROM pragma_table_info("${tablename}")`)
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
      bisectorseries,
      bisectorlist,
      snack,
      updateAvailable,
      updateDownloaded,
      tatablelist, 
      tatableseries,
      tagraphlist,
      tagraphseries,
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
                  <div>Delete Duplicate</div>
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
            
            
            <ShowMore>
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

                    <Button variant="primary" disabled={disabled} style={{marginLeft:'10px'}} onClick={()=>{this.resetKpiList()}}>
                      Reset
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
            </ShowMore>
            
            
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
              
              
              <ShowMore>
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
                <Button disabled={disabled} onClick={()=>{this.resetBhLayerChart()}} style={{'marginLeft':'10px'}}>Reset</Button>
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
              </ShowMore>
              
              
            </div>
            <div style={{marginTop:"30px",borderTop:"1px solid #cecece", paddingTop:"10px"}}>
              <h4>BH Main KPI Graph</h4>
              <ShowMore>
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
                  <Button disabled={disabled} style={{'marginLeft':"10px"}} onClick={()=>{this.resetBhMainChart()}}>Reset</Button>
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
              </ShowMore>
              
            </div>

            <div style={{marginTop:"30px",borderTop:"1px solid #cecece", paddingTop:"10px"}}>
              <h4>BiSector Graph</h4>
              
              
              <ShowMore>
                <Form onSubmit={this.addBiSectorChartHandler} style={{marginBottom:"10px"}}>
                  <Form.Row>
                    <Form.Group as={Col} controlId="form-graph-bisector-title">
                      <Form.Label>Graph Title</Form.Label>
                      <Form.Control required type="text" placeholder="Enter graph title"></Form.Control>
                    </Form.Group>
                    <Form.Group as={Col}>
                      <Form.Label>Graph Series</Form.Label>
                      <Dropdown>
                        <Dropdown.Toggle variant="light">{kpiList[bisectorseries] ? kpiList[bisectorseries].name : 'Select series'}</Dropdown.Toggle>
                        <Dropdown.Menu>
                          {kpiList.map((kpi, kpiid)=>{
                            return <Dropdown.Item key={kpi.ID} eventKey={kpiid} onSelect={(evtKey)=>{this.setState({bisectorseries:evtKey})}}>{kpi.name}</Dropdown.Item>
                          })}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Form.Group>
                  </Form.Row> 

                  <Button type="submit"  disabled={disabled}>Add</Button>
                  <Button disabled={disabled} onClick={()=>{this.resetBiSectorList()}} style={{'marginLeft':'10px'}}>Reset</Button>
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
                    {bisectorlist.map((bisector, bisectorid)=>{
                      return (
                        <tr key={bisectorid}>
                          <td>{bisectorid+1}</td>
                          <td>{bisector.title}</td>
                          <td>{bisector.seriesname}</td>
                          <td><Delete action={()=>{this.deleteBisectorChartList(bisector.ID)}}/></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </ShowMore>
              
              
            </div>

          </Card.Body>
        </Card>
        
        <Card className="card-section">
          <Card.Header>
            Timing Advance
          </Card.Header>
          <Card.Body>
            <Button variant="secondary" onClick={()=>{this.setState({taTableDialog:true})}} disabled={disabled}>Query TA</Button>
            <div style={{marginTop:"30px",borderTop:"1px solid #cecece", paddingTop:"10px"}}>
              <h4>TA Table</h4>

              
              <ShowMore>
                <Form onSubmit={this.addTaTableHandler} style={{marginBottom:"10px"}}>
                  <Form.Row>
                    <Form.Group as={Col} controlId="form-table-ta-title">
                      <Form.Label>TA Range Title</Form.Label>
                      <Form.Control required type="text" placeholder="Enter TA Title"></Form.Control>
                    </Form.Group>
                    <Form.Group as={Col}>
                      <Form.Label>TA Series</Form.Label>
                      <Dropdown>
                        <Dropdown.Toggle variant="light">{kpiList[tatableseries] ? kpiList[tatableseries].name : 'Select series'}</Dropdown.Toggle>
                        <Dropdown.Menu>
                          {kpiList.map((kpi, kpiid)=>{
                            return <Dropdown.Item key={kpi.ID} eventKey={kpiid} onSelect={(evtKey)=>{this.setState({tatableseries:evtKey})}}>{kpi.name}</Dropdown.Item>
                          })}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Form.Group>
                  </Form.Row> 
                  
                  <Button type="submit"  disabled={disabled}>Add</Button>
                  <Button disabled={disabled} style={{'marginLeft':'10px'}} onClick={()=>{this.resetTaTableList()}}>Reset</Button>
                </Form>
                <Table size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>TA Title</th>
                      <th>TA Series</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tatablelist.map((tatable, tatableid)=>{
                      return (
                        <tr key={tatableid}>
                          <td>{tatableid+1}</td>
                          <td>{tatable.title}</td>
                          <td>{tatable.seriesname}</td>
                          <td>{<Delete action={()=>{this.deleteTaTableList(tatable.ID)}}/>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </ShowMore>
              
            </div>
            <div style={{marginTop:"30px",borderTop:"1px solid #cecece", paddingTop:"10px"}}>
              <h4>TA Chart</h4>
              
              <ShowMore>
                <Form onSubmit={this.addTaGraphHandler} style={{marginBottom:'10px'}}>
                  <Form.Row>
                    <Form.Group as={Col} controlId="form-graph-ta-title">
                      <Form.Label>TA Range Title</Form.Label>
                      <Form.Control required type="text" placeholder="Enter TA Title"></Form.Control>
                    </Form.Group>
                    <Form.Group as={Col}>
                      <Form.Label>TA Series</Form.Label>
                      <Dropdown>
                        <Dropdown.Toggle variant="light">{kpiList[tagraphseries] ? kpiList[tagraphseries].name : 'Select series'}</Dropdown.Toggle>
                        <Dropdown.Menu>
                          {kpiList.map((kpi, kpiid)=>{
                            return <Dropdown.Item key={kpi.ID} eventKey={kpiid} onSelect={(evtKey)=>{this.setState({tagraphseries:evtKey})}}>{kpi.name}</Dropdown.Item>
                          })}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Form.Group>
                  </Form.Row>
                  <Button type="submit"  disabled={disabled}>Add</Button>
                  <Button disabled={disabled} style={{'marginLeft':'10px'}} onClick={()=>{this.resetTaGraphList()}}>Reset</Button>
                </Form>
                <Table size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>TA Title</th>
                      <th>TA Series</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tagraphlist.map((tagraph, tagraphid)=>{
                      return (
                        <tr key={tagraphid}>
                          <td>{tagraphid+1}</td>
                          <td>{tagraph.title}</td>
                          <td>{tagraph.seriesname}</td>
                          <td>{<Delete action={()=>{this.deleteTaGraphList(tagraph.ID)}}/>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </ShowMore>
              
            </div>
          </Card.Body>
        </Card>
        

        <Card className="card-section">
          <Card.Header>
            Hotspot
          </Card.Header>
          <Card.Body>
            <Button variant="secondary" onClick={()=>{this.setState({hotspotDialog:true})}} disabled={disabled}>Query Hotspot</Button>
          </Card.Body>
        </Card>

        <Modal centered onHide={this.handleKpiGraphClose} show={this.state.kpiGraphDialog} dialogClassName="large-dialog">
          <Modal.Header>KPI Graph</Modal.Header>
          <Modal.Body>
            <KpiGraph handleSnackMessage={this.handleSnackMessage} mrlayerlist={mrlayerlist} project={selectedProject} mrmainlist={mrmainlist} bisectorlist={bisectorlist} />
          </Modal.Body>
        </Modal>

        <Modal centered scrollable onHide={this.handleTaTableCLose} show={this.state.taTableDialog} dialogClassName="large-dialog">
          <Modal.Header>TA Table & Graph</Modal.Header>
          <Modal.Body>
            <TaTable handleSnackMessage={this.handleSnackMessage} tatablelist={tatablelist} project={selectedProject} tagraphlist={tagraphlist}/>
          </Modal.Body>
        </Modal>

        <Modal centered scrollable onHide={this.handleHotspotClose} show={this.state.hotspotDialog} size="lg">
          <Modal.Header>Hotspot</Modal.Header>
          <Modal.Body>
            <Hotspot handleSnackMessage={this.handleSnackMessage} project={selectedProject}/>
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
