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
 */
export function getSolanaExplorerUrl(address: string, clusterId: string): string {
  if (clusterId === 'solana:localnet') {
    // For localnet, use explorer.solana.com with custom cluster parameter
    const customUrl = encodeURIComponent('http://localhost:8899')
    return `https://explorer.solana.com/address/${address}?cluster=custom&customUrl=${customUrl}`
  } else if (clusterId === 'solana:testnet') {
    return `https://explorer.solana.com/address/${address}?cluster=testnet`
  } else if (clusterId === 'solana:mainnet') {
    return `https://explorer.solana.com/address/${address}`
  } else {
    // Default to devnet
    return `https://explorer.solana.com/address/${address}?cluster=devnet`
  }
}