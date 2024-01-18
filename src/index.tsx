import "./index.css";
import App from "./App";
import { RecoilRoot } from "recoil";
import ReactDOM from "react-dom/client";
import { DataContextProvider } from "./contexts/DataContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <RecoilRoot>
    <DataContextProvider>
      <App />
    </DataContextProvider>
  </RecoilRoot>
);
