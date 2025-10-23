import { Keypair } from '@solana/web3.js'
import keypairData from '../config/usdc-mint-keypair.json'

// Load the USDC mint address from the keypair stored in src/config/
function getLocalnetUsdcMint(): string {
  try {
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData))
    const mintAddress = keypair.publicKey.toBase58()
    console.debug('[ClusterConfig] Loaded localnet USDC mint from keypair:', mintAddress)
    return mintAddress
  } catch (error) {
    console.error('[ClusterConfig] Failed to load localnet USDC mint from keypair:', error)
    return ''
  }
}

const localnetUsdcMint = getLocalnetUsdcMint()

export const CLUSTER_CONFIG = {
  devnet: {
    usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
  localnet: {
    usdcMint: localnetUsdcMint,
  },
} as const

export type ClusterId = keyof typeof CLUSTER_CONFIG