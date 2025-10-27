import { PublicKey } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fetchMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { publicKey } from '@metaplex-foundation/umi'

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Map cluster ID to RPC endpoint
 */
function getRpcEndpoint(clusterId: string): string {
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
 * Get the Metaplex metadata PDA for a given mint
 * Used for deriving the metadata account address needed for on-chain metadata updates
 */
export async function getMetadataPdaForMint(mintAddress: string): Promise<string> {
  const mint = new PublicKey(mintAddress)
  const [metadataPda] = await PublicKey.findProgramAddress(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  )
  return metadataPda.toBase58()
}

/**
 * Fetch the share price from a REIT mint's Metaplex metadata
 * Uses the Metaplex SDK to fetch metadata and parse the JSON (same approach as Update REIT Modal)
 * @param mintAddress - The mint address to fetch metadata for
 * @param rpcEndpoint - Optional RPC endpoint. Defaults to localnet if not provided
 */
export async function getSharePriceFromMetadata(mintAddress: string, rpcEndpoint?: string): Promise<number> {
  const endpoint = rpcEndpoint || getRpcEndpoint('solana:localnet')
  console.log('[METADATA] RPC Endpoint:', endpoint)

  // Create UMI instance
  const umi = createUmi(endpoint)

  // Derive metadata account address
  const [metadataPda] = await PublicKey.findProgramAddress(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      new PublicKey(mintAddress).toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )

  console.log('[METADATA] Fetching metadata for mint:', mintAddress)
  console.log('[METADATA] Metadata PDA:', metadataPda.toBase58())

  // Fetch metadata using Metaplex SDK
  const metadata = await fetchMetadata(umi, publicKey(metadataPda.toString()))

  if (!metadata) {
    throw new Error('Metadata account not found')
  }

  console.log('[METADATA] Metadata URI:', metadata.uri)

  // Fetch and parse the JSON metadata
  const response = await fetch(metadata.uri)
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata JSON: ${response.status}`)
  }

  const metadataJson = await response.json()
  console.log('[METADATA] Fetched metadata JSON:', metadataJson)

  // Extract share price from attributes
  const sharePriceAttr = metadataJson.attributes?.find((attr: any) => attr.trait_type === 'share_price')
  if (!sharePriceAttr?.value) {
    throw new Error('Share price not found in REIT metadata attributes')
  }

  const sharePrice = parseFloat(sharePriceAttr.value)
  if (isNaN(sharePrice) || sharePrice <= 0) {
    throw new Error('Invalid share price in metadata')
  }

  console.log('[METADATA] Extracted share price:', sharePrice)
  return sharePrice
}
