import { defineChain } from "viem";
import { defaultWagmiConfig } from "@web3modal/wagmi";
import { cookieStorage, createStorage, http } from 'wagmi';

export const projectId = import.meta.env.VITE_APP_WC_PROJECT_ID;

// Create wagmiConfig
export const networks = [
    defineChain({
        id: Number(import.meta.env.VITE_APP_CHAINID) || 27272,
        name: "DMD Diamond",
        nativeCurrency: {
            name: "DMD",
            symbol: "DMD",
            decimals: 18,
        },
        rpcUrls: {
            default: {
                http: [import.meta.env.VITE_APP_RPC_URL || 'https://beta-rpc.bit.diamonds/'],
                webSocket: [import.meta.env.VITE_APP_WS_URL || 'wss://beta-rpc.bit.diamonds/ws'],
            },
        },
        blockExplorers: {
            default: {
                name: "DMD Explorer",
                url: import.meta.env.VITE_APP_EXPLORER_URL || "https://beta-explorer.bit.diamonds/",
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
        [Number(import.meta.env.VITE_APP_CHAINID) || 27272]: http(import.meta.env.VITE_APP_RPC_URL || 'https://beta-rpc.bit.diamonds/')
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
