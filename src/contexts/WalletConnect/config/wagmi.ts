import { defineChain } from '@reown/appkit/networks'
import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import config from '@/lib/config'

export const getProjectId = () => config.wcProjectId

export const getNetworks = () => [
    defineChain({
        id: Number(config.chainId) || 17771,
        chainNamespace: 'eip155',
        caipNetworkId: `eip155:${Number(config.chainId) || 17771}`,
        name: config.chainName || "DMD Diamond",
        nativeCurrency: {
            name: "DMD",
            symbol: "DMD",
            decimals: 18,
        },
        rpcUrls: {
            default: {
                http: [config.rpcUrl],
                webSocket: [config.wsUrl],
            },
        },
        blockExplorers: {
            default: {
                name: "DMD Explorer",
                url: config.explorerUrl,
            },
        },
    })
];

export const projectId = getProjectId()
export const networks = getNetworks()

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId: projectId,
  networks
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

export function updateWagmiNetworks() {
  const updatedNetworks = getNetworks()
  return updatedNetworks
}
