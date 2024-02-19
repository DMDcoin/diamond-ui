import "./index.css";
import App from "./App";
import { RecoilRoot } from "recoil";
import ReactDOM from "react-dom/client";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { DaoContextProvider } from "./contexts/DaoContext";
import { Web3ContextProvider } from "./contexts/Web3Context";
import { StakingContextProvider } from "./contexts/StakingContext";


const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <RecoilRoot>
    <Web3ContextProvider>
      <DaoContextProvider>
        <StakingContextProvider>
          <App />
          <ToastContainer
            position="bottom-right"
            autoClose={5000}
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </StakingContextProvider>
      </DaoContextProvider>
    </Web3ContextProvider>
  </RecoilRoot>
);
