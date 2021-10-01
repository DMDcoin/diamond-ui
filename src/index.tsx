import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { ModelDataAdapter } from './model/modelDataAdapter';
import Web3 from 'web3';

// import reportWebVitals from './reportWebVitals';

const url = new URL(process.env.REACT_APP_URL || 'http://localhost:8540');
const validatorSetContractAddress = process.env.REACT_APP_VALIDATORSET_CONTRACT || '0x1000000000000000000000000000000000000001';


//const adapter = new ModelDataAdapter();


console.log('connecting to web3: ', url);
console.log('connecting to web3 url: ', url.toString());

// debug
declare let window: any;

const web3 = new Web3(url.toString());
ModelDataAdapter.initialize(web3, validatorSetContractAddress)
  .then((adapter) => {
    // debug
    window.context = adapter;

    ReactDOM.render(
      <App modelDataAdapter={adapter} />,
      document.getElementById('root'),
    );
  }).catch((err) => {
    alert(`initializing failed: ${err}`);
  });

ReactDOM.render(
  <React.StrictMode>
    <h1>loading...</h1>
  </React.StrictMode>,
  document.getElementById('root')
);



// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
