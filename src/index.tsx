import "bootstrap/dist/css/bootstrap.min.css";
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { ModelDataAdapter } from "./model/modelDataAdapter";

const url = new URL(process.env.REACT_APP_URL || "http://localhost:8540");

console.log("connecting to web3: ", url);
console.log("connecting to web3 url: ", url.toString());

// debug
declare let window: any;

ModelDataAdapter.initialize(url).then((adapter) => {
  // debug
  window.context = adapter;

  ReactDOM.render(
    <App modelDataAdapter={adapter} />,
    document.getElementById("root")
  );
}); //.catch((err) => {
// alert(`initializing failed: ${err}`);
// });

// ReactDOM.render(
//   <React.StrictMode>
//     <h1>loading...</h1>
//   </React.StrictMode>,
//   document.getElementById("root")
// );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
