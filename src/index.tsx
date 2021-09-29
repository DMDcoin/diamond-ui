import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import Context from './model/context';
import { ModelDataAdapter } from './model/modelDataAdapter';


const wsUrl = new URL(process.env.REACT_APP_WS_URL || 'ws://localhost:9540');
const ensRpcUrl = new URL(process.env.REACT_APP_ENS_RPC_URL || 'https://main-rpc.linkpool.io');
const validatorSetContractAddress = process.env.REACT_APP_VALIDATORSET_CONTRACT || '0x1000000000000000000000000000000000000001';


//const adapter = new ModelDataAdapter();

// debug
declare let window: any;

ModelDataAdapter.initialize(wsUrl, ensRpcUrl, validatorSetContractAddress)
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
reportWebVitals();
