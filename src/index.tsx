import "./index.css";
import App from "./App";
import { RecoilRoot } from "recoil";
import ReactDOM from "react-dom/client";
import { Web3ContextProvider } from "./contexts/Web3Context";
import { StakingContextProvider } from "./contexts/StakingContext";
import { DaoContextProvider } from "./contexts/DaoContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <RecoilRoot>
    <Web3ContextProvider>
      <DaoContextProvider>
        <StakingContextProvider>
          <App />
        </StakingContextProvider>
      </DaoContextProvider>
    </Web3ContextProvider>
  </RecoilRoot>
);
