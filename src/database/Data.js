import React from 'react';
import { Database } from '../Database';
import Highcharts from "highcharts";
import HighchartsReact from 'highcharts-react-official';
import { Button , Form , Icon , Menu, Table , Pagination , List , Segment , Header , Loader} from 'semantic-ui-react';
import { Card  , Overlay , Modal } from 'react-bootstrap';
//import ChartLoading from '../img/chart-loading.gif';
import SpinnerGif from '../img/spinner-gif.gif';
import * as moment from 'moment';
import Excel from 'exceljs';
import FreezeContext from './../module/FreezeView';
import { ToastContext } from './../module/ToastContext';
import AppContext from './../module/AppContext';

function Reset(props){
    const { show , onHide  } = props 
    const appContext = React.useContext(AppContext)
    const formulaList = [
        {name:'DL User Throughput(Mbps)',formula:'avg(DL_User_Average_Throughput_Mbps)'},
        {name:'DL Max Throughput(Mbps)',formula:'avg(Cell_DL_Max_ThroughputtoPDCP_Mbps)'},
        {name:'Total DL Traffic Volume(GB)',formula:'avg(Total_DL_Traffic_Volume_GB)'},
        {name:'Avg No. of user',formula:'avg(Avg_No_of_user_number)'},
        {name:'PRB DL (%)',formula:'avg(PRB_Usage_DL)'},
        {name:'DL.CAUser.Traffic(GB)',formula:'avg(DL_CAUser_Traffic_GB)'},
        {name:'Ave CQI',formula:'avg(CQI_Avg)'},
        {name:'L.Traffic.User.PCell.DL.Avg',formula:'avg(L_Traffic_User_PCell_DL_Avg)'},
        {name:'L.Traffic.User.SCell.DL.Avg',formula:'avg(L_Traffic_User_SCell_DL_Avg)'},
        {name:'PDSCH IBLER',formula:'avg(PDSCH_IBLER)'},
        {name:'DL Edge User TP (Mbps)',formula:'avg(M_DL_Edge_User_Throughput_Mbps)'},
        {name:'DCR',formula:'avg(ERAB_DCR_MME)'},
        {name:'HOSR',formula:'avg(HO_Success_Rate)'},
        {name:'CSFB SR',formula:'avg(CSFB_Preparation_Success_Rate)'},
        {name:'Avg UL Interference(dBm)',formula:'avg(Avg_UL_Interference_dBm)'},
        {name:'CSSR',formula:'avg(CSSR)'},
        {name:'TA (0-78m)%',formula:'sum(L_RA_TA_UE_Index0)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (78m-234m)%',formula:'sum(L_RA_TA_UE_Index1)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (234m-546m)%',formula:'sum(L_RA_TA_UE_Index2)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (546m-1014m)%',formula:'sum(L_RA_TA_UE_Index3)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (1014m-1950m)%',formula:'sum(L_RA_TA_UE_Index4)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (1950m-3510m)%',formula:'sum(L_RA_TA_UE_Index5)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (3510m-6630m)%',formula:'sum(L_RA_TA_UE_Index6)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (6630m-14430m)%',formula:'sum(L_RA_TA_UE_Index7)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (14430m-30030m)%',formula:'sum(L_RA_TA_UE_Index8)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (30030m-53430m)%',formula:'sum(L_RA_TA_UE_Index9)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (53430m-76830m)%',formula:'sum(L_RA_TA_UE_Index10)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (>76830m)%',formula:'sum(L_RA_TA_UE_Index11)/sum(L_RA_TA_UE_0to11)'},
        {name:'TA (0-78m)',formula:'sum(L_RA_TA_UE_Index0)'},
        {name:'TA (78m-234m)',formula:'sum(L_RA_TA_UE_Index1)'},
        {name:'TA (234m-546m)',formula:'sum(L_RA_TA_UE_Index2)'},
        {name:'TA (546m-1014m)',formula:'sum(L_RA_TA_UE_Index3)'},
        {name:'TA (1014m-1950m)',formula:'sum(L_RA_TA_UE_Index4)'},
        {name:'TA (1950m-3510m)',formula:'sum(L_RA_TA_UE_Index5)'},
        {name:'TA (3510m-6630m)',formula:'sum(L_RA_TA_UE_Index6)'},
        {name:'TA (6630m-14430m)',formula:'sum(L_RA_TA_UE_Index7)'},
        {name:'TA (14430m-30030m)',formula:'sum(L_RA_TA_UE_Index8)'},
        {name:'TA (30030m-53430m)',formula:'sum(L_RA_TA_UE_Index9)'},
        {name:'TA (53430m-76830m)',formula:'sum(L_RA_TA_UE_Index10)'},
        {name:'TA (>76830m)',formula:'sum(L_RA_TA_UE_Index11)'},

    ]

    const ztedigiconfigs = [
        { 
            operation: 'Clear all configuration', commands: [
                'DROP TABLE IF EXISTS formulas',
                'DROP TABLE IF EXISTS antennaswap2g',
                'DROP TABLE IF EXISTS antennaswap3g',
                'DROP TABLE IF EXISTS antennaswap4g', 
                'DROP TABLE IF EXISTS antennaswapblended',
                'DROP TABLE IF EXISTS antennaswapblendeddata',
                'DROP TABLE IF EXISTS ta2gchart',
                'DROP TABLE IF EXISTS ta3gchart',
                'DROP TABLE IF EXISTS ta4gchart', 
            ], status: 'none'
        },{
            operation: 'Create default KPI list', commands: [
                `CREATE TABLE formulas ( ID INTEGER PRIMARY KEY AUTOINCREMENT , name TEXT , formula TEXT , tablename TEXT , singletable INTERGER)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'Blended_Voice_Traffic'  , 'sum(Total_Traffic_2G)+sum(Traffic_Volumn_CSAMR_Erl)' , 'RAW2G;RAW3G' , 0)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'GSM_Traffic_Cell'  , 'sum(Total_Traffic_2G)' , 'RAW2G' , 1)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'GSM_CSSR'  , 'sum(Call_Setup_SR_Num)/sum(Call_Setup_SR_Denom)' , 'RAW2G' , 1)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'GSM_DCR'  , 'sum(TCH_Drop_Num)/sum(TCH_Drop_Denom)' , 'RAW2G' , 1)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'UMTS_Traffic'  , 'sum(Traffic_Volumn_CSAMR_Erl)' , 'RAW3G' , 1)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'UMTS_CSSR_AMR'  , '(sum(CSSR_RRC_Success_Num)/sum(CSSR_RRC_Attempt_Denom))*(sum(CSSR_RAB_Success_Num)/sum(CSSR_RAB_Attempt_Denom))' , 'RAW3G' , 1)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'UMTS_DCR_AMR'  , 'sum(CS_Drop_RAB_Drop_Num)/sum(CS_Drop_RAB_Release_Denom)' , 'RAW3G' , 1)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'LTE_PSSR'  , 'avg(PSSR)' , 'RAW4G' , 1)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'LTE_Intra_HOSR'  , 'avg(IntraInter_HOSR)' , 'RAW4G' , 1)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'LTE_UL_PDCP_SDU_Loss_Rate'  , 'sum(UL_PDCP_SDU_LossRate)' , 'RAW4G' , 1)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'LTE_Max_RRC_Connected_User'  , 'sum(Max_RRC_Connected_User)' , 'RAW4G' , 1)`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'LTE_DL_Traffic_Gb' , 'sum(LTE_DL_Traffic_MByte)/1000' , 'RAW4G', 1)`
                /*`INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'Number_of_TA0' , 'sum(Number_of_TA0)' , 'TA2G' , 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'Number_of_TA1' , 'sum(Number_of_TA1)' , 'TA2G' , 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'Number_of_TA2' , 'sum(Number_of_TA2)' , 'TA2G' , 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'Number_of_TA3' , 'sum(Number_of_TA3)' , 'TA2G' , 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'Number_of_TA4' , 'sum(Number_of_TA4)' , 'TA2G' , 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'Number_of_TA5' , 'sum(Number_of_TA5)' , 'TA2G' , 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'pd_step1_0to234m' , 'sum(pd_step1_0to234m)' , 'TA3G' , 1 )` ,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'pd_step2_234to703m' , 'sum(pd_step2_234to703m)' , 'TA3G' , 1 )` ,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'pd_step3_703to1172m' , 'sum(pd_step3_703to1172m)' , 'TA3G' , 1 )` ,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'pd_step4_1172to1641m' , 'sum(pd_step4_1172to1641m)' , 'TA3G' , 1 )` ,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'pd_step5_1641to2109m' , 'sum(pd_step5_1641to2109m)' , 'TA3G' , 1 )` ,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'pd_step6_2109to2578m' , 'sum(pd_step6_2109to2578m)' , 'TA3G' , 1 )` ,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'pd_step7_2578to3281m' , 'sum(pd_step7_2578to3281m)' , 'TA3G' , 1 )` ,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_0_to_1' , 'sum(report_time_ta_range_0_to_1)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_1_to_3' , 'sum(report_time_ta_range_1_to_3)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_3_to_5' , 'sum(report_time_ta_range_3_to_5)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_5_to_7' , 'sum(report_time_ta_range_5_to_7)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_7_to_9' , 'sum(report_time_ta_range_7_to_9)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_9_to_11' , 'sum(report_time_ta_range_9_to_11)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_11_to_13' , 'sum(report_time_ta_range_11_to_13)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_13_to_20' , 'sum(report_time_ta_range_13_to_20)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_20_to_27' , 'sum(report_time_ta_range_20_to_27)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_27_to_34' , 'sum(report_time_ta_range_27_to_34)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_34_to_50' , 'sum(report_time_ta_range_34_to_50)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_40_to_50' , 'sum(report_time_ta_range_40_to_50)' , 'TA4G', 1 )`,
                `INSERT INTO formulas ( name , formula , tablename , singletable ) VALUES ( 'report_time_ta_range_50_to_81' , 'sum(report_time_ta_range_50_to_81)' , 'TA4G', 1 )`,*/

            ], status: 'none'
        },{
            operation: 'Create antenna swap chart & reporting', commands: [
                `CREATE TABLE antennaswap2g ( ID INTEGER PRIMARY KEY AUTOINCREMENT , title TEXT , formulaid INTEGER , grouplevel TEXT, formatting TEXT , FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO antennaswap2g ( title , formulaid , grouplevel, formatting ) VALUES ('Traffic Cell' , (SELECT ID FROM formulas where name='GSM_Traffic_Cell') , 'cell' , 'general')`,
                `INSERT INTO antennaswap2g ( title , formulaid , grouplevel, formatting ) VALUES ('CSSR Cell' , (SELECT ID FROM formulas where name='GSM_CSSR') , 'cell', 'percentage')`,
                `INSERT INTO antennaswap2g ( title , formulaid , grouplevel, formatting ) VALUES ('DCR Cell' , (SELECT ID FROM formulas where name='GSM_DCR') , 'cell', 'percentage')`,
                `INSERT INTO antennaswap2g ( title , formulaid , grouplevel, formatting ) VALUES ('CSSR Site' , (SELECT ID FROM formulas where name='GSM_CSSR') , 'site', 'percentage')`,
                `INSERT INTO antennaswap2g ( title , formulaid , grouplevel, formatting ) VALUES ('DCR Site' , (SELECT ID FROM formulas where name='GSM_DCR') , 'site', 'percentage')`,
                `CREATE TABLE antennaswap3g ( ID INTEGER PRIMARY KEY AUTOINCREMENT , title TEXT , formulaid INTEGER , grouplevel TEXT, formatting TEXT , FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO antennaswap3g ( title , formulaid , grouplevel, formatting ) VALUES ('Traffic Cell' , (SELECT ID FROM formulas where name='UMTS_Traffic') , 'sector', 'general')`,
                `INSERT INTO antennaswap3g ( title , formulaid , grouplevel, formatting ) VALUES ('CSSR Cell' , (SELECT ID FROM formulas where name='UMTS_CSSR_AMR') , 'sector', 'percentage')`,
                `INSERT INTO antennaswap3g ( title , formulaid , grouplevel, formatting ) VALUES ('DCR Cell' , (SELECT ID FROM formulas where name='UMTS_DCR_AMR') , 'sector', 'percentage')`,
                `INSERT INTO antennaswap3g ( title , formulaid , grouplevel, formatting ) VALUES ('CSSR Site' , (SELECT ID FROM formulas where name='UMTS_CSSR_AMR') , 'site', 'percentage')`,
                `INSERT INTO antennaswap3g ( title , formulaid , grouplevel, formatting ) VALUES ('DCR Site' , (SELECT ID FROM formulas where name='UMTS_DCR_AMR') , 'site', 'percentage')`,
                `CREATE TABLE antennaswap4g ( ID INTEGER PRIMARY KEY AUTOINCREMENT , title TEXT , formulaid INTEGER , grouplevel TEXT, formatting TEXT , FOREIGN KEY (formulaid) REFERENCES formulas(ID))`, 
                `INSERT INTO antennaswap4g ( title , formulaid , grouplevel, formatting ) VALUES ('PSSR' , (SELECT ID FROM formulas where name='LTE_PSSR') , 'cell', 'general')`,
                `INSERT INTO antennaswap4g ( title , formulaid , grouplevel, formatting ) VALUES ('Intra HO SR' , (SELECT ID FROM formulas where name='LTE_Intra_HOSR') , 'cell', 'general')`,
                `INSERT INTO antennaswap4g ( title , formulaid , grouplevel, formatting ) VALUES ('UL PDCP SDU Loss Rate' , (SELECT ID FROM formulas where name='LTE_UL_PDCP_SDU_Loss_Rate') , 'cell', 'general')`,
                `INSERT INTO antennaswap4g ( title , formulaid , grouplevel, formatting ) VALUES ('Maximum RRC-Connected User Number' , (SELECT ID FROM formulas where name='LTE_Max_RRC_Connected_User') , 'site', 'general')`,
                `INSERT INTO antennaswap4g ( title , formulaid , grouplevel, formatting ) VALUES ('DL Data Traffic' , (SELECT ID FROM formulas where name='LTE_DL_Traffic_Gb') , 'cell', 'general')`,
                `CREATE TABLE antennaswapblended ( ID INTEGER PRIMARY KEY AUTOINCREMENT , title TEXT , formulaid INTEGER , FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO antennaswapblended ( title , formulaid ) VALUES ( 'Blended 2G + 3G Voice Traffic (Erl)' , (SELECT ID FROM formulas WHERE name = 'Blended_Voice_Traffic' ))`,
                `INSERT INTO antennaswapblended ( title , formulaid ) VALUES ( '2G Voice Traffic' , (SELECT ID FROM formulas WHERE name = 'GSM_Traffic_Cell' ))`,
                `INSERT INTO antennaswapblended ( title , formulaid ) VALUES ( '3G Voice Traffic' , (SELECT ID FROM formulas WHERE name = 'UMTS_Traffic' ))`,
                `CREATE TABLE antennaswapblendeddata ( ID INTEGER PRIMARY KEY AUTOINCREMENT , title TEXT , formulaid INTEGER , FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO antennaswapblendeddata ( title , formulaid) VALUES ('4G DL Data Traffic (GB)' , (SELECT ID FROM formulas where name='LTE_DL_Traffic_Gb'))`,
            ], status: 'none'
        }, /*{
            operation: 'Create TA chart' , commands : [
                `CREATE TABLE ta2gchart (ID INTEGER PRIMARY KEY AUTOINCREMENT , title TEXT , formulaid INTEGER , FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO ta2gchart ( title , formulaid ) VALUES ( 'Number of TA 0', (SELECT ID FROM formulas where name='Number_of_TA0') )`,
                `INSERT INTO ta2gchart ( title , formulaid ) VALUES ( 'Number of TA 1', (SELECT ID FROM formulas where name='Number_of_TA1') )`,
                `INSERT INTO ta2gchart ( title , formulaid ) VALUES ( 'Number of TA 2', (SELECT ID FROM formulas where name='Number_of_TA2') )`,
                `INSERT INTO ta2gchart ( title , formulaid ) VALUES ( 'Number of TA 3', (SELECT ID FROM formulas where name='Number_of_TA3') )`,
                `INSERT INTO ta2gchart ( title , formulaid ) VALUES ( 'Number of TA 4', (SELECT ID FROM formulas where name='Number_of_TA4') )`,
                `INSERT INTO ta2gchart ( title , formulaid ) VALUES ( 'Number of TA 5', (SELECT ID FROM formulas where name='Number_of_TA5') )`,
                `CREATE TABLE ta3gchart (ID INTEGER PRIMARY KEY AUTOINCREMENT , title TEXT , formulaid INTEGER , FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO ta3gchart ( title , formulaid ) VALUES ( ' Propagation Delay Step 1 (0,234)m', (SELECT ID FROM formulas where name='pd_step1_0to234m') ) `, 
                `INSERT INTO ta3gchart ( title , formulaid ) VALUES ( ' Propagation Delay Step 2 (234,703)m', (SELECT ID FROM formulas where name='pd_step2_234to703m') ) `, 
                `INSERT INTO ta3gchart ( title , formulaid ) VALUES ( ' Propagation Delay Step 3 (703,1172)m', (SELECT ID FROM formulas where name='pd_step3_703to1172m') ) `, 
                `INSERT INTO ta3gchart ( title , formulaid ) VALUES ( ' Propagation Delay Step 4 (1172,1641)m', (SELECT ID FROM formulas where name='pd_step4_1172to1641m') ) `, 
                `INSERT INTO ta3gchart ( title , formulaid ) VALUES ( ' Propagation Delay Step 5 (1641,2109)m', (SELECT ID FROM formulas where name='pd_step5_1641to2109m') ) `, 
                `INSERT INTO ta3gchart ( title , formulaid ) VALUES ( ' Propagation Delay Step 6 (2109,2578)m', (SELECT ID FROM formulas where name='pd_step6_2109to2578m') ) `, 
                `INSERT INTO ta3gchart ( title , formulaid ) VALUES ( ' Propagation Delay Step 7 (2578,3281)m', (SELECT ID FROM formulas where name='pd_step7_2578to3281m') ) `, 
                `CREATE TABLE ta4gchart (ID INTEGER PRIMARY KEY AUTOINCREMENT , title TEXT , formulaid INTEGER , FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 0 to 1 ( 0m to 78m)', (SELECT ID FROM formulas where name='report_time_ta_range_0_to_1') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 1 to 3 (78m to 284m)', (SELECT ID FROM formulas where name='report_time_ta_range_1_to_3') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 3 to 5 (284m to 390m)', (SELECT ID FROM formulas where name='report_time_ta_range_3_to_5') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 5 to 7 (390m to 546m)', (SELECT ID FROM formulas where name='report_time_ta_range_5_to_7') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 7 to 9 (546m to 702m)', (SELECT ID FROM formulas where name='report_time_ta_range_7_to_9') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 9 to 11 (702m to 858m)', (SELECT ID FROM formulas where name='report_time_ta_range_9_to_11') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 11 to 13 (858m to 1014m)', (SELECT ID FROM formulas where name='report_time_ta_range_11_to_13') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 13 to 20 (1014m to 1560m)', (SELECT ID FROM formulas where name='report_time_ta_range_13_to_20') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 20 to 27 (1560m to 2106m)', (SELECT ID FROM formulas where name='report_time_ta_range_20_to_27') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 27 to 34 (1560m to 2652m)', (SELECT ID FROM formulas where name='report_time_ta_range_27_to_34') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 34 to 40 (2652m to 3120m)', (SELECT ID FROM formulas where name='report_time_ta_range_34_to_50') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 40 to 50 (3120m to 3900m)', (SELECT ID FROM formulas where name='report_time_ta_range_40_to_50') )`,
                `INSERT INTO ta4gchart ( title , formulaid ) VALUES ( 'Report Times of TA Value in the range of 50 to 81 (3120m to 6318m)', (SELECT ID FROM formulas where name='report_time_ta_range_50_to_81') )`,
            ], status: 'none'
        }*/
    ]
    const huaweimaxisconfigs = [
        {
            operation: 'Clear all configuration', commands: [
                'DROP TABLE IF EXISTS formulas' ,
                'DROP TABLE IF EXISTS bhlayer',
                'DROP TABLE IF EXISTS mrlayerchart',
                'DROP TABLE IF EXISTS bhmain',
                'DROP TABLE IF EXISTS mrmainchart',
                'DROP TABLE IF EXISTS bisectorchart',
                'DROP TABLE IF EXISTS bisector',
                'DROP TABLE IF EXISTS tagraph',
                'DROP TABLE IF EXISTS tagraph2', 
                'DROP TABLE IF EXISTS tatable', 
                'DROP TABLE IF EXISTS tatable2',
                'DROP INDEX IF EXISTS timeobject'
        ], status:'none'},{
            operation: 'Create default KPI list', commands:[
                `CREATE TABLE formulas ( ID INTEGER PRIMARY KEY AUTOINCREMENT , name TEXT , formula TEXT)`, 
                ...formulaList.map(formula => `INSERT INTO formulas (name , formula) VALUES ( '${formula.name}', '${formula.formula}')`)
            ], status:'none'
        }, {
            operation: 'Create default Bh layer charts', commands: [
                `CREATE TABLE bhlayer ( ID INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, formulaid INTEGER, FOREIGN KEY (formulaid) REFERENCES formulas(ID) )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'DL User Throughput(Mbps)' , (SELECT ID FROM formulas WHERE formulas.name = 'DL User Throughput(Mbps)') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'Avg No. of user' , (SELECT ID FROM formulas WHERE formulas.name = 'Avg No. of user') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'PRB DL (%)' , (SELECT ID FROM formulas WHERE formulas.name = 'PRB DL (%)') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'Ave CQI' , (SELECT ID FROM formulas WHERE formulas.name = 'Ave CQI') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'PDSCH IBLER' , (SELECT ID FROM formulas WHERE formulas.name = 'PDSCH IBLER') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'DL.CAUser.Traffic(GB)' , (SELECT ID FROM formulas WHERE formulas.name = 'DL.CAUser.Traffic(GB)') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'DL Max Throughput(Mbps)' , (SELECT ID FROM formulas WHERE formulas.name = 'DL Max Throughput(Mbps)') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'L.Traffic.User.PCell.DL.Avg' , (SELECT ID FROM formulas WHERE formulas.name = 'L.Traffic.User.PCell.DL.Avg') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'L.Traffic.User.SCell.DL.Avg' , (SELECT ID FROM formulas WHERE formulas.name = 'L.Traffic.User.SCell.DL.Avg') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'Total DL Traffic Volume(GB)' , (SELECT ID FROM formulas WHERE formulas.name = 'Total DL Traffic Volume(GB)') )`,
                `INSERT INTO bhlayer ( title , formulaid ) VALUES ( 'DL Edge User TP (Mbps)' , (SELECT ID FROM formulas WHERE formulas.name = 'DL Edge User TP (Mbps)') )`,

            ], status:'none'
        }, {
            operation: 'Create default Bh main charts', commands: [
                `CREATE TABLE bhmain ( ID INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, formulaid INTEGER, baselinetitle TEXT , baselinevalue REAL , FOREIGN KEY (formulaid) REFERENCES formulas(ID) )`,
                `INSERT INTO bhmain ( title , formulaid , baselinetitle , baselinevalue ) VALUES ( 'DCR' , (SELECT ID FROM formulas WHERE formulas.name = 'DCR') , 'DCR Baseline' , 2.5 )`,
                `INSERT INTO bhmain ( title , formulaid , baselinetitle , baselinevalue ) VALUES ( 'CSSR' , (SELECT ID FROM formulas WHERE formulas.name = 'CSSR') , 'CSSR Baseline' , 95 )`,
                `INSERT INTO bhmain ( title , formulaid , baselinetitle , baselinevalue ) VALUES ( 'HOSR' , (SELECT ID FROM formulas WHERE formulas.name = 'HOSR') , 'HOSR Baseline' , 97 )`,
                `INSERT INTO bhmain ( title , formulaid , baselinetitle , baselinevalue ) VALUES ( 'CSFB SR' , (SELECT ID FROM formulas WHERE formulas.name = 'CSFB SR') , 'CSFB Baseline' , 98.5)`,
                `INSERT INTO bhmain ( title , formulaid ) VALUES ( 'Avg UL Interference(dBm)' , (SELECT ID FROM formulas WHERE formulas.name = 'Avg UL Interference(dBm)'))`,
            ], status:'none'
        }, {
            operation: 'Create default Bisector charts', commands: [
                `CREATE TABLE bisector ( ID INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, formulaid INTEGER, FOREIGN KEY (formulaid) REFERENCES formulas(ID) )`,
                `INSERT INTO bisector ( title , formulaid ) VALUES ( 'DL User Throughput(Mbps)' , (SELECT ID FROM formulas WHERE formulas.name = 'DL User Throughput(Mbps)') )`,
                `INSERT INTO bisector ( title , formulaid ) VALUES ( 'Avg No. of user' , (SELECT ID FROM formulas WHERE formulas.name = 'Avg No. of user') )`,
                `INSERT INTO bisector ( title , formulaid ) VALUES ( 'PRB DL (%)' , (SELECT ID FROM formulas WHERE formulas.name = 'PRB DL (%)') )`,
                `INSERT INTO bisector ( title , formulaid ) VALUES ( 'Ave CQI' , (SELECT ID FROM formulas WHERE formulas.name = 'Ave CQI') )`,
            ], status:'none'
        }, {
            operation: 'Create default TA charts', commands: [
                `CREATE TABLE tagraph2 ( ID INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, formulaid INTEGER , seriesname TEXT, FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(0-78m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (0-78m)') , 'TA (0-78m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(78m-234m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (78m-234m)') , 'TA (78m-234m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(234m-546m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (234m-546m)') , 'TA (234m-546m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(546m-1014m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (546m-1014m)') , 'TA (546m-1014m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(1014m-1950m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (1014m-1950m)') , 'TA (1014m-1950m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(1950m-3510m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (1950m-3510m)') , 'TA (1950m-3510m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(3510m-6630m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (3510m-6630m)') , 'TA (3510m-6630m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(6630m-14430m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (6630m-14430m)') , 'TA (6630m-14430m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(14430m-30030m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (14430m-30030m)') , 'TA (14430m-30030m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(30030m-53430m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (30030m-53430m)') , 'TA (30030m-53430m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(53430m-76830m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (53430m-76830m)') , 'TA (53430m-76830m)' )`,
                `INSERT INTO tagraph2 ( title , formulaid , seriesname ) VALUES ( '(>76830m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (>76830m)') , 'TA (>76830m)' )`,

            ], status:'none'
        }, {
            operation: 'Create default TA table', commands: [
                `CREATE TABLE tatable2 ( ID INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, formulaid INTEGER , seriesname TEXT ,  FOREIGN KEY (formulaid) REFERENCES formulas(ID))`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(0-78m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (0-78m)%') , 'TA (0-78m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(78m-234m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (78m-234m)%') , 'TA (78m-234m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(234m-546m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (234m-546m)%') , 'TA (234m-546m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(546m-1014m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (546m-1014m)%') , 'TA (546m-1014m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(1014m-1950m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (1014m-1950m)%') , 'TA (1014m-1950m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(1950m-3510m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (1950m-3510m)%') , 'TA (1950m-3510m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(3510m-6630m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (3510m-6630m)%') , 'TA (3510m-6630m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(6630m-14430m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (6630m-14430m)%') , 'TA (6630m-14430m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(14430m-30030m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (14430m-30030m)%') , 'TA (14430m-30030m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(30030m-53430m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (30030m-53430m)%') , 'TA (30030m-53430m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(53430m-76830m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (53430m-76830m)%') , 'TA (53430m-76830m)%' )`,
                `INSERT INTO tatable2 ( title , formulaid , seriesname ) VALUES ( '(>76830m)' , (SELECT ID FROM formulas WHERE formulas.name = 'TA (>76830m)') , 'TA (>76830m)' )`,                

            ], status:'none'
        }
    ]

    const [ configuration , setConfiguration ] = React.useState(ztedigiconfigs)
    const [ inOperation , setInOperation ] = React.useState(false)

    React.useEffect(()=>{
        return () => {
            if(!show){
                if(appContext.project === 'huaweimaxis'){
                    setConfiguration(huaweimaxisconfigs)
                }else if(appContext.project === 'ztedigi'){
                    setConfiguration(ztedigiconfigs)
                }
            }
        }
    },[show])

    React.useEffect(()=>{
        if(appContext.project === 'huaweimaxis'){
            setConfiguration(huaweimaxisconfigs)
        }else if(appContext.project === 'ztedigi'){
            setConfiguration(ztedigiconfigs)
        }
    },[appContext.project])
    
    return <Modal show={show} onHide={onHide} backdrop="static" centered>
        <Modal.Header>Reset configuration</Modal.Header>
        <Modal.Body>
            <List>
                {configuration.map((config, configId) => {
                    return <List.Item key={configId} icon={config.status === 'none'?'hand point right':config.status ==='success'? 'thumbs up outline': 'times'} content={config.operation}/>
                })}
            </List>
        </Modal.Body>
        <Modal.Footer>
            <Button primary disabled={inOperation} onClick={async ()=>{
                setInOperation(true)
                let db = new Database()

                for(let i = 0 ; i < configuration.length ; i++){
                    const { commands } = configuration[i]
                    let failCount = 0 
                    let successCount = 0
                    for(let j = 0 ; j < commands.length ; j++){
                        await db.update(commands[j]).then((response)=>{
                            if(response.status === 'Ok'){
                                successCount++
                            }else{
                                console.log(`Fail to run this commmand : ${commands[j]}`)
                                failCount++
                            }
                        })
                    }

                    setConfiguration((oldConfig)=>{
                        let _oldConfig = [...oldConfig]
                        _oldConfig[i].status = successCount === commands.length ? 'success' : 'fail'
                        return _oldConfig
                    })
                }

                appContext.updateTables()
                setInOperation(false)
            }}>Reset</Button>
            <Button secondary disabled={inOperation} onClick={()=>onHide()}>Exit</Button>
        </Modal.Footer>
    </Modal>
}

function ListCell(props){
    const { show , onHide } = props 
    const [ isTableSelected, setTableSelected ] = React.useState(false)
    const [ cellList , setCellList ] = React.useState(['Cell 1' , 'Cell 2' , 'Cell 3'])
    const [ cells , setCells ] = React.useState([])
    const [ activePage , setActivePage ] = React.useState(0)
    const appContext = React.useContext(AppContext)
    const listPerPage = 8

    React.useEffect(()=>{
        if(show){
            appContext.promptTableSelection((table)=>{
                console.log(`List all cell for table [${table}]`)
                let db = new Database()
                db.query(`SELECT ${appContext.objectDate.object} as [object] FROM ${table} GROUP BY ${appContext.objectDate.object}`).then((response) => {
                    if(response.status === 'Ok'){
                        setCellList(response.result.map(entry => entry.object))
                        setCells(response.result.map(entry => entry.object))
                        setTableSelected(true)
                    }else{
                        throw Error("Unable to load cell list")
                    }
                })
            })
            /*let db = new Database()
            db.query(`SELECT Cell_Name FROM main GROUP BY Cell_Name`).then((response)=>{
                if(response.status === 'Ok'){
                    setCellList(response.result.map(entry => entry.Cell_Name))
                    setCells(response.result.map(entry => entry.Cell_Name))
                }else{
                    throw Error("Unable to load cell list")
                }
            }).catch((err)=>{
            })*/
        }

        return ()=>{
            if(!show){
                setCellList([])
                setCells([])
                setTableSelected(false)
            }
        }
    },[show])


    return <Modal show={show && isTableSelected} onHide={onHide} scrollable centered>
        <Modal.Header>
            <div style={{display:'flex', alignItems: 'center', width: '100%'}}>
                <div><h4>Available cells</h4></div>
                <div style={{flexGrow: 1}}></div>
                <Form onSubmit={(e)=>{
                    let form = e.target
                    let _filter = form.querySelector("#filter-cell").value
                    setCells(cellList.filter(cell => {
                        let regex = new RegExp(_filter , 'i')
                        return cell.match(regex)
                    }))
                }}>
                    <Form.Group inline style={{margin: '0px'}}>
                        <Form.Input id="filter-cell" type="text" placeholder="Search cell" />
                        <Button icon ><Icon name="search" /></Button>
                    </Form.Group>
                    
                </Form>
                
            </div>
        </Modal.Header>
        <Modal.Body>
            
            <Table celled striped size="small">
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell>Cell Name</Table.HeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {cells.slice(activePage*listPerPage, (activePage+1)*listPerPage).map((cell,id)=>(
                        <Table.Row key={id}>
                            <Table.Cell>{cell}</Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
                <Table.Footer>
                    <Table.Row>
                        <Table.HeaderCell>
                            <div style={{display:'flex'}}>
                                <div style={{flexGrow: 1}}></div>   
                                <Pagination 
                                    activePage={activePage}
                                    boundaryRange={0}
                                    onPageChange={(e,{activePage})=>setActivePage(activePage-1)}
                                    totalPages={Math.floor(cells.length/listPerPage)} />
                            </div>
                            
                        </Table.HeaderCell>
                    </Table.Row>
                </Table.Footer>
            </Table>
        </Modal.Body>    
    </Modal>
}

function ConfirmAction(props){
    const { show , onHide , action , text } = props

    return <Modal show={show} onHide={onHide} centered>
        <Modal.Header>
            <h4>Confirmation</h4>
        </Modal.Header>
        <Modal.Body>
            <span>{text}</span>
        </Modal.Body>
        <Modal.Footer>
            <Button primary onClick={()=>action()}>Proceed</Button>
            <Button secondary onClick={()=>onHide()}>Cancel</Button>
        </Modal.Footer>
    </Modal>
}

function Data(){
    const [ confirm , setConfirm ] = React.useState({show: false , action: ()=>{}, text: ''})
    //const [ uploading, setUploading ] = React.useState(false)
    //const [ progress , setProgress ] = React.useState(0)
    //const [ progressText , setProgressText ] = React.useState('')
    //const [ loading , setLoading ] = React.useState(true)
    const [chartProps , setChartProps ] = React.useState(null)
    const [ startdate , setStartdate ] = React.useState(moment(new Date()).startOf('day').subtract(31 , 'day').format("YYYY-MM-DD"))
    const [ enddate , setEnddate ] = React.useState(moment(new Date()).startOf('day').subtract(1 , 'day').format("YYYY-MM-DD"))
    const moreTarget = React.useRef();
    const [ showMore , setShowMore ] = React.useState(false)
    const [ showCellList , setShowCellList ] = React.useState(false)
    const [ showReset, setShowReset ] = React.useState(false)
    const [ filter , setFilter] = React.useState('')
    const [ isIndex , setIsIndex ] = React.useState(true)
    const freezeContext = React.useContext(FreezeContext)
    const toastContext = React.useContext(ToastContext)
    const appContext = React.useContext(AppContext)
    const [ isQuerying , setIsQuerying ] = React.useState(false)

    const queryCellCount = async (start , end , filter) => {
        setIsQuerying(true)
        console.log(appContext)
        let queries = appContext.main.filter(table => appContext.tables.includes(table)).map(table => {
            return {table:table, command:`SELECT date(${appContext.objectDate.date}) as [date] , count(${appContext.objectDate.object}) as [cell_count] FROM ${table} WHERE date >= '${start}' and date <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ${!!filter ? `and object LIKE '${filter}%'`: ''}GROUP BY date(${appContext.objectDate.date}) ORDER BY ${appContext.objectDate.date}`}
    })
        let range = new Array(moment(end).diff(start, 'day')+1).fill('').map((entry, id) => moment(start).clone().add(id , 'day').format('YYYY-MM-DD'))
        let charts = {
            chart:{
                type: 'line',
                plotBackgroundColor: '#f5f5f5'
            },
            title: {
                text: 'Cell Count'
            }, 
            xAxis: {
                categories: range
            }, 
            yAxis: {
                title:{
                    text: 'Number of cells'
                }
            }, 
            series:[]
        }
        for(let i=0,q; q=queries[i];i++){
            console.log(q.command)
            let query = await new Database().query(q.command)
            console.log(query)
            if(query.status === 'Ok'){
                let result = query.result.reduce((obj , entry) => ({...obj , [entry.date]:entry.cell_count}) , {})
                charts.series.push({
                    name: q.table, 
                    data: range.map(date => {
                        return [date , result[date] === undefined ? 0 : result[date]]
                    })
                })
            }
        }

        //console.log(queries)
        //console.log(charts)
        setChartProps(charts)
        /*let query = new Database().query(`SELECT date(date) as [date], count(object) as [cell_count] FROM RAW2G WHERE date >= '${start}' and date <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' ${!!filter ? `and object LIKE '${filter}%'`: ''}GROUP BY date(date) ORDER BY date`)
        
        return query.then((response)=>{
            if(response.status === 'Ok'){
                console.log(response.result)
                let range = new Array(moment(end).diff(start, 'day')+1).fill('').map((entry, id) => moment(start).clone().add(id , 'day').format('YYYY-MM-DD'))
                let result = response.result.reduce((obj , entry) => ({...obj , [entry.date]:entry.cell_count}) , {})
                setChartProps({
                    chart:{
                        type: 'column',
                        plotBackgroundColor: '#f5f5f5'
                    },
                    title: {
                        text: 'Cell Count'
                    }, 
                    xAxis: {
                        categories: range
                    }, 
                    yAxis: {
                        title:{
                            text: 'Number of cells'
                        }
                    }, 
                    series:[{
                        name: '4G',
                        data: range.map(date => {
                            return [date , result[date] === undefined ? 0 : result[date]]
                        })
                    }]
                })
            }else{
                throw Error("Unable to get cell count")
            }
        }).catch((err)=>{
            console.log(err.message)
        }).finally(()=>{
            setIsQuerying(false)
        })*/
    }

    const removeDuplicated = (start , end) => {
        appContext.promptTableSelection((table)=>{
            let db = new Database()
            freezeContext.setFreeze(true, "Deleting duplicate entry...")
            db.run(`DELETE FROM ${table} WHERE ID NOT IN ( SELECT MIN(ID) FROM ${table} WHERE ${appContext.objectDate.date} >= '${start}' and ${appContext.objectDate.date} <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:mm:ss")}' GROUP BY [${appContext.objectDate.object}], date([${appContext.objectDate.date}])) and ${appContext.objectDate.date} >= '${start}' and ${appContext.objectDate.date} <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:mm:ss")}'`).then((response)=>{
                if(response.status === 'Ok'){
                    console.log(response.affectedRows)
                }else{
                    throw Error("Unable to delete duplicate rows")
                }
            }).then(() => {
                queryCellCount(start, end)
            }).catch((err)=>{
                console.log(err.message)
            }).finally(()=>{
                freezeContext.setFreeze(false)
                queryCellCount(start, end)
            })
        })
        
    }

    const deleteData = (start , end ) => {
        appContext.promptTableSelection((table)=>{
            let db = new Database()
            freezeContext.setFreeze(true, `Deleting data [${table}] from ${start} until ${end}...`)
            db.run(`DELETE FROM ${table} WHERE ${appContext.objectDate.date} >= '${start}' and  ${appContext.objectDate.date} <= '${moment(end).endOf('day').format("YYYY-MM-DD HH:mm:ss")}'`).then((response)=>{
                if(response.status === 'Ok'){
                    console.log(response.affectedRows)
                }else{
                    throw Error("Unable to delete data")
                }
            }).catch((error)=>{
                console.log(error.message)
            }).finally(()=>{
                freezeContext.setFreeze(false)
                queryCellCount(start, end)
            })
        })
    }

    const exportRawData = async (start , end , filter, table) => {
        freezeContext.setFreeze(true , "Exporting raw data")
        //setUploading(true)
        let db = new Database()
        let wb = new Excel.Workbook()
        let ws = wb.addWorksheet("data")
        let queryDate = moment(start).clone()
        let totalStep = moment(end).diff(queryDate , 'days') + 1
        let step = 1
        let header = false
        while(moment(end).diff(queryDate) >= 0){
            //setProgress(Math.round(step/totalStep*100))
            console.log(`Query data for date [${queryDate.format('YYYY-MM-DD')}] and [${queryDate.clone().endOf('days').format('YYYY-MM-DD HH:mm:ss')}] `)
            let query = `SELECT * FROM ${table} WHERE ([${appContext.objectDate.date}] between '${queryDate.format('YYYY-MM-DD')}' and '${queryDate.clone().endOf('days').format('YYYY-MM-DD HH:mm:ss')}') ${filter ? `and [${appContext.objectDate.object}] LIKE '${filter}%'`: ''}`
            let response = await db.querybig(query)

            if(response.status === 'Ok'){
                let data = JSON.parse(response.result)
                for(let i = 0 ; i < data.length ; i++){
                    if(!header) {ws.addRow(Object.keys(data[i]));header=true}
                    ws.addRow(Object.values(data[i]))
                }
            }
            step += 1
            queryDate.add(1, 'days')
        }

        await wb.xlsx.writeBuffer().then((buffer) => {
            let blob = new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
            let elem = window.document.createElement("a")
            elem.href = window.URL.createObjectURL(blob)
            elem.download = 'data.xlsx'
            elem.click()
        })

        freezeContext.setFreeze(false)
        //setUploading(false)
    }
    //query cell count 
    const init = async () => {
        let db = new Database()
        
        db.query(`SELECT type , name , tbl_name, sql FROM sqlite_master WHERE type ='index' and ( ${appContext.tables.filter(table => appContext.main.includes(table)).map(table => `tbl_name = '${table}'`).join(" or ")} ) and name LIKE 'timeobject_%' `).then((response)=>{
            if(response.status === 'Ok'){
                if(response.result.length === appContext.tables.filter(table => appContext.main.includes(table)).length){
                    setIsIndex(true)
                    return true
                }else{
                    setIsIndex(false)
                    return false
                }
            }else{
                throw new Error("Unable to query index")
            }
        }).then((isIndexed) => {
            console.log(isIndexed)
            if(isIndexed){
                //queryCellCount(startdate , enddate)
            }else{
                toastContext.setInfo('Database is not optimized.')
            }
            
        }).catch((error)=>{
            
        })
    }

    React.useEffect(()=>{
        //Check project main database is indexing or not
        console.log(`Check appContext [${appContext.tables.filter(table => appContext.main.includes(table)).join(",")}]`)
        if(appContext.tables.filter(table => appContext.main.includes(table)).join(",").length > 0){
            init()
        }
    }, [appContext.tables])

    return <div style={{marginTop: '10px', height: 'calc(100vh - 110px)', overflowY: 'auto'}}>
        <Card className="react-card">
            <Card.Body>
                    <Form>
                        <Form.Group widths="equal" inline>
                            <Form.Input className="semantic-react-form-input" type="date" required label="Start Date" max={enddate} value={startdate} onChange={(e,{value})=>setStartdate(value)}/>
                            <Form.Input className="semantic-react-form-input" type="date" required label="End Date" min={startdate} value={enddate} onChange={(e,{value})=>setEnddate(value)}/>
                            <Form.Input className="semantic-react-form-input" type="text" label="Filter cells" value={filter} onChange={(e,{value})=>setFilter(value)} />
                            <Button  onClick={()=>{
                                setChartProps(null)
                                queryCellCount(startdate , enddate, filter)
                            }}>Query</Button>
                            <>
                                <div ref={moreTarget} style={{width:'20px',height: '20px', cursor: 'pointer'}} onClick={()=>{
                                    setShowMore(true)
                                }}>
                                    <Icon name="ellipsis vertical" />
                                </div>
                                <Overlay target={moreTarget.current} show={showMore} placement="bottom" rootClose={true} onHide={()=>setShowMore(false)}>
                                    {({
                                        placement,
                                        scheduleUpdate,
                                        arrowProps,
                                        outOfBoundaries,
                                        show: _show,
                                        ...props
                                    }) => (
                                        <Menu {...props} style={{...props.style}} vertical pointing={true}>
                                            <Menu.Item name="export-raw-data" disabled={appContext.main.filter(table => appContext.tables.includes(table)).length === 0} onClick={()=>{
                                                setShowCellList(true)
                                                setShowMore(false)
                                            }}>List available cells</Menu.Item>
                                            <Menu.Item name="export-raw-data"  disabled={appContext.main.filter(table => appContext.tables.includes(table)).length === 0} onClick={()=>{
                                                if(filter !== ''){
                                                    appContext.promptTableSelection((table)=>{
                                                        exportRawData(startdate , enddate , filter , table)
                                                    })
                                                }
                                                setShowMore(false)
                                            }}>Export raw data</Menu.Item>
                                            <Menu.Item name="show-database" onClick={()=>{
                                                let db = new Database()
                                                db.send("whereismydb")
                                                setShowMore(false)
                                            }}>Show database</Menu.Item>
                                            <Menu.Item name="link-database" onClick={()=>{
                                                let db = new Database()
                                                db.linkDatabase().then((response)=>{
                                                    if(response.status === 'Ok'){
                                                        if(response.result === 'linked'){
                                                            appContext.updateTables().then((tables)=>{
                                                                //if(tables.includes("main")){
                                                                //    // reinit the database
                                                                //    init()
                                                                //}
                                                                //queryCellCount(startdate, enddate , filter)
                                                                init()
                                                            })
                                                        }
                                                    }
                                                })
                                                setShowMore(false)
                                            }}>Link database</Menu.Item>
                                            <Menu.Item name="delete-duplicate" disabled={appContext.main.filter(table => appContext.tables.includes(table)).length === 0}  onClick={()=>{
                                                removeDuplicated(startdate, enddate)
                                                setShowMore(false)
                                            }}>Delete duplicate</Menu.Item>
                                            <Menu.Item name="delete-data"  disabled={appContext.main.filter(table => appContext.tables.includes(table)).length === 0} onClick={()=>{
                                                setConfirm({
                                                    show: true , 
                                                    action: ()=>{console.log('delete');deleteData(startdate, enddate)}, 
                                                    text: `Delete data from ${startdate} to ${enddate}`
                                                })
                                                setShowMore(false)
                                            }}>Delete data</Menu.Item>
                                            <Menu.Item name="reset" onClick={()=>{
                                                setShowReset(true)
                                                setShowMore(false)
                                            }}>
                                                Reset configuration
                                            </Menu.Item>
                                            {!isIndex && <Menu.Item name="optimize-database"  onClick={async ()=>{
                                                freezeContext.setFreeze(true, 'Creating index profile on database')
                                                let db = new Database()

                                                let allTable = appContext.tables.filter(table => appContext.main.includes(table))
                                                let indexedTable = await db.query(`SELECT type , name , tbl_name, sql FROM sqlite_master WHERE type ='index' and ( ${appContext.tables.filter(table => appContext.main.includes(table)).map(table => `tbl_name = '${table}'`).join(" or ")} ) and name LIKE 'timeobject_%' `).then(response => {
                                                    if(response.status === 'Ok'){
                                                        return response.result.map(row => row.tbl_name)
                                                    }else{
                                                        return []
                                                    }
                                                }).catch((error) => {
                                                    console.log('error while quering indexed table')
                                                    return []
                                                })

                                                //console.log(allTable)
                                                //console.log(indexTable)

                                                let tableToIndex = allTable.filter(table => !indexedTable.includes(table))
                                                //console.log(tableToIndex)
                                                let error = false
                                                for(let i = 0 ; i < tableToIndex.length ; i++){
                                                    console.log(`CREATE INDEX timeobject_${tableToIndex[i]} ON ${tableToIndex[i]} (${appContext.objectDate.date} COLLATE BINARY, ${appContext.objectDate.object} COLLATE NOCASE)`)
                                                    await db.update(`CREATE INDEX timeobject_${tableToIndex[i]} ON ${tableToIndex[i]} (${appContext.objectDate.date} COLLATE BINARY, ${appContext.objectDate.object} COLLATE NOCASE)`).then((response) => {
                                                        if(response.status === 'Ok'){
                                                            return 
                                                        }else{
                                                            error = true    
                                                            return
                                                        }
                                                    })
                                                }

                                                if(!error){
                                                    setIsIndex(true)
                                                }else{
                                                    toastContext.setError("Error while optimizing database")
                                                }

                                                
                                                /*db.update(`CREATE INDEX timeobject ON main (Date COLLATE BINARY, Cell_Name COLLATE NOCASE)`).then((response)=>{
                                                    if(response.status === 'Ok'){
                                                        setIsIndex(true)
                                                    }else{
                                                        
                                                    }
                                                }).finally(()=>{
                                                    freezeContext.setFreeze(false)
                                                })*/
                                                freezeContext.setFreeze(false)
                                                setShowMore(false)
                                            }}>
                                                Optimize database
                                            </Menu.Item>}
                                        </Menu>
                                    )}
                                </Overlay>
                            </>
                        </Form.Group>
                    </Form>
                    
                {appContext.main.filter(table => appContext.tables.includes(table)).length > 0 && chartProps !== null && <HighchartsReact highcharts={Highcharts} options={chartProps} containerProps={{style:{height:'52vh'}}}/>}
                {appContext.main.filter(table => appContext.tables.includes(table)).length > 0 && !isQuerying && chartProps === null && <Segment placeholder style={{display:'flex', justifyContent: 'center', alignItems: 'center',height:'50vh'}}><Header icon>Query to view daily cell count. Filter is optional</Header></Segment>}
                {appContext.main.filter(table => appContext.tables.includes(table)).length > 0 && isQuerying && chartProps === null && <div style={{display:'flex', justifyContent: 'center', alignItems: 'center',height:'50vh'}}><Loader active/></div>}
                {appContext.main.filter(table => appContext.tables.includes(table)).length === 0 && <Segment placeholder style={{height:'52vh'}}>
                    <Header icon>
                        No data
                    </Header>
                </Segment>}
            </Card.Body>
            <Card.Footer>
                {/*!uploading && <Button primary onClick={()=>{
                        let db = new Database();
                        db.upload(
                            'main', 
                            ()=>{
                                // on start uploading
                                //setUploading(true);setProgress(0);setProgressText("Parsing Data")
                                freezeContext.setFreeze(true , "Parsing data")
                            }, 
                            (param)=>{
                                // on uploading
                                //setProgressText("Uploading")
                                //setProgress(Math.round(param.progress*100))
                                freezeContext.setFreeze(true, "Uploading..." , param.progress*100)
                            },
                            ()=>{
                                // on loading end
                                //setUploading(false);setProgressText("");queryCellCount(startdate, enddate, filter)
                                freezeContext.setFreeze(false)
                                if(!appContext.tables.includes('main')){
                                    appContext.updateTables()
                                }
                            },
                            ()=>{
                                // on uploading error
                                //setUploading(false);setProgressText("")
                                freezeContext.setFreeze(false)
                                toastContext.setError('Error occured when uploading stats')
                            }
                        )
                    }}>
                        Select file to upload
                </Button>*/}
                {appContext.main.map((table,tableId) => <Button key={tableId} content='Upload' label={{basic:true,content:table}} primary onClick={()=>{
                    let db = new Database();
                    db.upload(
                        table,
                        appContext.uploadingFormat, 
                        ()=>{
                            // on start uploading
                            //setUploading(true);setProgress(0);setProgressText("Parsing Data")
                            freezeContext.setFreeze(true , "Parsing data")
                        }, 
                        (param)=>{
                            // on uploading
                            //setProgressText("Uploading")
                            //setProgress(Math.round(param.progress*100))
                            freezeContext.setFreeze(true, "Uploading..." , param.progress*100)
                        },
                        ()=>{
                            // on loading end
                            //setUploading(false);setProgressText("");queryCellCount(startdate, enddate, filter)
                            freezeContext.setFreeze(false)
                            if(!appContext.tables.includes(table)){
                                appContext.updateTables()
                            }
                            queryCellCount(startdate,enddate,filter)
                        },
                        ()=>{
                            // on uploading error
                            //setUploading(false);setProgressText("")
                            freezeContext.setFreeze(false)
                            toastContext.setError('Error occured when uploading stats')
                        }, 
                        appContext.uploadingOptions
                    )
                }}/>)}
            </Card.Footer>
        </Card>
        <ConfirmAction show={confirm.show} onHide={()=>{
            setConfirm({show: false , action:()=>{}, text: ''})
        }} action={confirm.action} text={confirm.text} />
        <ListCell show={showCellList} onHide={()=>setShowCellList(false)}/>

        <Reset show={showReset} onHide={()=>setShowReset(false)} />
    </div>
}

export default Data;