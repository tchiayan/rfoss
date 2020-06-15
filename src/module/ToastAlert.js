import React from 'react';

import { Snackbar } from '@material-ui/core';
import { Alert } from '@material-ui/lab';

function Toast(props){
    const { severity , show , onHide , message } = props 

    return <Snackbar open={show} autoHideDuration={6000} onClose={onHide}>
        <Alert onClose={handleClose} severity={severity}>
            {message}
        </Alert>
    </Snackbar>
}

export default Toast;