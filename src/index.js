import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';


// Firebase App (the core Firebase SDK) is always required and must be listed first
import * as firebase from "firebase/app";

// If you enabled Analytics in your project, add the Firebase SDK for Analytics
import "firebase/analytics";

// Add the Performance Monitoring library
import "firebase/performance";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyBdm0PcE3TrHlWu19yV6HWzcKbYtn1R6Gs",
    authDomain: "rock-sublime-819.firebaseapp.com",
    databaseURL: "https://rock-sublime-819.firebaseio.com",
    projectId: "rock-sublime-819",
    storageBucket: "rock-sublime-819.appspot.com",
    messagingSenderId: "63242757642",
    appId: "1:63242757642:web:5cdab42cd4458c5ef921f3",
    measurementId: "G-BDN7XF2H68"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

if(window.require){
    ReactDOM.render(<App />, document.getElementById('root'));
}


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
