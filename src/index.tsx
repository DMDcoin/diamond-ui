import "./index.css";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import { createRoot } from 'react-dom/client';
import { ModelDataAdapter } from "./model/modelDataAdapter";

const url = new URL(process.env.REACT_APP_URL || "http://localhost:8540");

declare let window: any;

ModelDataAdapter.initialize(url).then((adapter) => {
  const container: any = document.getElementById('root');
  const root = createRoot(container);

  window.context = adapter;

  root.render(
    <App adapter={adapter} />,
  );
});