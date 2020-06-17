import React from 'react';
import SpinnerGif from '../img/spinner-gif.gif';
import { LinearProgress } from '@material-ui/core';

const FreezeContext = React.createContext({})

export function FreezeModal(props){
    const { hide , message , value } = props;

    return <div style={{position:'absolute',height:'100vh',width:'100%', zIndex: 9999, display:hide?'flex':'none',backdropFilter:'blur(10px)',alignItems:'center',justifyContent:'center', flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center'}}>
            {(value === undefined || value === null) && <img src={SpinnerGif} width="24px" height="24px" />}
            <div style={{padding:'0px 10px'}}>{!!message ? message : 'Loading...' }</div>
        </div>
        {(!(value === undefined || value === null)) && <div style={{width:'50%', marginTop: '10px'}}>
            <LinearProgress  variant="determinate" value={value} />
        </div>}
        
    </div>
}
export const FreezeProvider = FreezeContext.Provider

export default FreezeContext