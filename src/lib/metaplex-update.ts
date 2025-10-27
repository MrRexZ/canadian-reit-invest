import { PublicKey } from '@solana/web3.js'

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

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
