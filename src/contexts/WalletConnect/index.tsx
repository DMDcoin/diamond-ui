import React, { createContext, ReactNode, useContext } from "react";

import { WagmiProvider} from "wagmi";
import { AppKit } from '@web3modal/base';
import { wagmiConfig, projectId } from "./config";
import { createWeb3Modal } from "@web3modal/wagmi";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const appKit = createWeb3Modal({
    wagmiConfig: wagmiConfig,
    projectId,
    enableSwaps: false,
    enableAnalytics: false,
    enableOnramp: false,
    allowUnsupportedChain: true,
    featuredWalletIds: [
        "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // metamask
        "163d2cf19babf05eb8962e9748f9ebe613ed52ebf9c8107c9a0f104bfcf161b3", // brave
        "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa", // coinbase
    ],
    themeMode: "light",
    themeVariables: {
        "--w3m-accent": "#0145b2",
        "--w3m-color-mix": "#0e44b2",
        "--w3m-color-mix-strength": 20,
    },
    allWallets: "HIDE",
});

interface WalletConnectContextProps { 
    appKit: AppKit;
}

const WalletConnectContext = createContext<WalletConnectContextProps | undefined>(undefined);

const WalletConnectContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const contextValue: WalletConnectContextProps = {
        appKit,
    };
    return (
        <WagmiProvider config={wagmiConfig}>
            <WalletConnectContext.Provider value={contextValue}>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            </WalletConnectContext.Provider>
        </WagmiProvider>
    );
};

const useWalletConnectContext = (): WalletConnectContextProps => {
    const context = useContext(WalletConnectContext);

    if (context === undefined) {
        throw new Error("Couldn't fetch WalletConnect Context");
    }

    return context;
};

export { WalletConnectContextProvider, useWalletConnectContext };
