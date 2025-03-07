import "./index.css";
import App from "./App";
import React from "react";
import ReactDOM from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify"
import { DaoContextProvider } from "./contexts/DaoContext";
import { Web3ContextProvider } from "./contexts/Web3Context";
import { StakingContextProvider } from "./contexts/StakingContext";
import { WalletConnectContextProvider } from "./contexts/WalletConnect";

interface AppContextProviderProps {
  children: React.ReactNode;
}

const AppContextProvider: React.FC<AppContextProviderProps> = ({
  children,
}) => {
  return (
    <WalletConnectContextProvider>
      <Web3ContextProvider>
      <StakingContextProvider>
        <DaoContextProvider>
          
            {children}
          
        </DaoContextProvider>
        </StakingContextProvider>
      </Web3ContextProvider>
    </WalletConnectContextProvider>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <AppContextProvider>
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
  </AppContextProvider>
);
