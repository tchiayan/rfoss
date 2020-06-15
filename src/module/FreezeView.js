import React from 'react';
import SpinnerGif from '../img/spinner-gif.gif';

const FreezeContext = React.createContext({})

export function FreezeModal(props){
    const { hide , message } = props;
    return <div style={{position:'absolute',height:'100vh',width:'100%', zIndex: 9999, display:hide?'flex':'none',backdropFilter:'blur(10px)',alignItems:'center',justifyContent:'center'}}>
        <div style={{display:'flex',alignItems:'center'}}>
            <img src={SpinnerGif} width="24px" height="24px" />
            <div style={{padding:'0px 10px'}}>{!!message ? message : 'Loading...' }</div>
        </div>
    </div>
}
export const FreezeProvider = FreezeContext.Provider

export default FreezeContext