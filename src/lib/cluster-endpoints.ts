/**
 * Utility functions for cluster and endpoint management
 */

/**
 * Map cluster ID to RPC endpoint
 */
export function getRpcEndpoint(clusterId: string): string {
  switch (clusterId) {
    case 'solana:mainnet':
      return 'https://api.mainnet-beta.solana.com'
    case 'solana:devnet':
      return 'https://api.devnet.solana.com'
    case 'solana:testnet':
      return 'https://api.testnet.solana.com'
    case 'solana:localnet':
    default:
      return 'http://localhost:8899'
  }
}

/**
 * Generate Solana Explorer URL based on cluster
 * @param addressOrTx - Can be an address or transaction signature
 * @param clusterId - The cluster ID (e.g., 'solana:mainnet', 'solana:localnet')
 * @param type - Optional type: 'address' (default) or 'tx' for transaction
 */
export function getSolanaExplorerUrl(addressOrTx: string, clusterId: string, type: 'address' | 'tx' = 'address'): string {
  const pathType = type === 'tx' ? 'tx' : 'address'
  
  if (clusterId === 'solana:localnet') {
    // For localnet, use explorer.solana.com with custom cluster parameter
    const customUrl = encodeURIComponent('http://localhost:8899')
    return `https://explorer.solana.com/${pathType}/${addressOrTx}?cluster=custom&customUrl=${customUrl}`
  } else if (clusterId === 'solana:testnet') {
    return `https://explorer.solana.com/${pathType}/${addressOrTx}?cluster=testnet`
  } else if (clusterId === 'solana:mainnet') {
    return `https://explorer.solana.com/${pathType}/${addressOrTx}`
  } else {
    // Default to devnet
    return `https://explorer.solana.com/${pathType}/${addressOrTx}?cluster=devnet`
  }
}