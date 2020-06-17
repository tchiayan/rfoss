import React from 'react';
import { Snackbar } from '@material-ui/core'
import { Alert } from '@material-ui/lab';

const ToastContext = React.createContext({})

const ToastProvider = ToastContext.Provider

function ErrorModal(props){
    const { open , onClose , message } = props
    return <Snackbar open={open} autoHideDuration={6000} onClose={onClose} anchorOrigin={{vertical:'bottom',horizontal:'right'}}>
        <Alert onClose={onClose} severity="error">
            {message}
        </Alert>
    </Snackbar> 
}

function InfoModal(props){
    const { open , onClose , message } = props
    return <Snackbar open={open} autoHideDuration={6000} onClose={onClose} anchorOrigin={{vertical:'bottom',horizontal:'right'}}>
        <Alert onClose={onClose} severity="info">
            {message}
        </Alert>
    </Snackbar> 
}
export { ErrorModal , InfoModal , ToastProvider , ToastContext} 