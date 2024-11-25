import { defineChain } from "viem";
import { defaultWagmiConfig } from "@web3modal/wagmi";
import { cookieStorage, createStorage, http } from 'wagmi';

export const projectId = import.meta.env.VITE_APP_WC_PROJECT_ID;

// Create wagmiConfig
export const networks = [
    defineChain({
        id: Number(import.meta.env.VITE_APP_CHAINID) || 777018,
        name: "DMD Diamond",
        nativeCurrency: {
            name: "DMD",
            symbol: "DMD",
            decimals: 18,
        },
        rpcUrls: {
            default: {
                http: [import.meta.env.VITE_APP_RPC_URL || 'http://62.171.133.46:55100/'],
                webSocket: [import.meta.env.VITE_APP_WS_URL || 'wss://alpha4.uniq.domains/ws'],
            },
        },
        blockExplorers: {
            default: {
                name: "DMD Explorer",
                url: import.meta.env.VITE_APP_EXPLORER_URL || "http://62.171.133.46:4400/",
            },
        },
    })
] as const;

// Create a metadata object
const metadata = {
    name: "Diamond DMD",
    description: "Diamond DMD",
    url: "https://dmd-ui.vercel.app/",
    icons: ["/favicon.ico"],
};

export const wagmiConfig = defaultWagmiConfig({
    chains: networks,
    metadata,
    transports: {
        777018: http(import.meta.env.VITE_APP_RPC_URL || 'http://62.171.133.46:55100/')
    },
    projectId,
    ssr: true,
    storage: createStorage({
        storage: cookieStorage,
    }),
    auth: {
        email: false,
        socials: [],
    }
});
