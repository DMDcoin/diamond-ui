import { NextResponse } from 'next/server';

/**
 * Runtime Configuration API Endpoint
 */
export async function GET() {
  const config = {
    // Blockchain Configuration
    chainId: process.env.NEXT_PUBLIC_CHAINID || '',
    chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || '',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || '',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || '',
    explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || '',
    // Contract Addresses
    claimingContractAddress: process.env.NEXT_PUBLIC_CLAIMING_CONTRACT_ADDRESS || '',
    aggregatorContractAddress: process.env.NEXT_PUBLIC_AGGREGATOR_CONTRACT_ADDRESS || '',
    daoContractAddress: process.env.NEXT_PUBLIC_DAO_CONTRACT_ADDRESS || '',
    lowMajorityContractAddress: process.env.NEXT_PUBLIC_LOW_MAJORITY_CONTRACT_ADDRESS || '',
    diamondRegistryContractAddress: process.env.NEXT_PUBLIC_DIAMOND_REGISTRY_CONTRACT_ADDRESS || '',
    // WalletConnect
    wcProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '2cceb4f25f1cb889b967ea3c40bfd7cd',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
    reportEmail: process.env.NEXT_PUBLIC_REPORT_EMAIL || '',
  };

  return NextResponse.json(config, {
    headers: {
      // Cache for 5 minutes to reduce load, but allow updates
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
