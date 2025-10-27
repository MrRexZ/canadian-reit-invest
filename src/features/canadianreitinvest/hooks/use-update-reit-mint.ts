import { useMutation } from '@tanstack/react-query'
import { UiWalletAccount } from '@wallet-ui/react'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { uploadReitMetadataToSupabase, ReitMetadata } from '@/lib/supabase-file-upload'
import { getMetadataPdaForMint } from '@/lib/metaplex-update'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { parse as uuidParse } from 'uuid'
import { getUpdateReitMintInstructionAsync } from '@/generated'
import { CLUSTER_CONFIG } from '@/lib/cluster-config'
import { useTransactionRecovery } from './use-transaction-recovery'
import type { Address } from 'gill'

/**
 * Hook for updating REIT mint metadata
 * Handles updating both the JSON metadata file in Supabase Storage AND the on-chain Metaplex metadata
 * Transaction status is recovered via the useUpdateReitMintRecovery hook
 */
export function useUpdateReitMint({ account }: { account: UiWalletAccount }) {
  const signer = account ? useWalletUiSigner({ account }) : null
  const signAndSend = useWalletUiSignAndSend()

  return useMutation({
    mutationFn: async ({ reitId, mintAddress, name, symbol, description, sharePrice, currency }: {
      reitId: string;
      mintAddress: string;
      name: string;
      symbol: string;
      description: string;
      sharePrice: string;
      currency: string;
    }) => {
      if (!account || !account.publicKey || !signer) {
        toast.error('Wallet not connected')
        return
      }

      const adminPublicKey = new PublicKey(account.publicKey)

      console.log('[UPDATE MINT DEBUG] Starting update mint process')
      console.log('[UPDATE MINT DEBUG] REIT ID:', reitId)
      console.log('[UPDATE MINT DEBUG] Mint Address:', mintAddress)
      console.log('[UPDATE MINT DEBUG] Name:', name)
      console.log('[UPDATE MINT DEBUG] Symbol:', symbol)
      console.log('[UPDATE MINT DEBUG] Description:', description)
      console.log('[UPDATE MINT DEBUG] Share Price:', sharePrice)
      console.log('[UPDATE MINT DEBUG] Currency:', currency)
      console.log('[UPDATE MINT DEBUG] Admin public key:', adminPublicKey.toBase58())

      // Verify admin is the authorized admin wallet
      const adminWallet = import.meta.env.VITE_ADMIN_WALLET
      console.log('[UPDATE MINT DEBUG] Expected admin wallet from env:', adminWallet)
      console.log('[UPDATE MINT DEBUG] Current signer:', adminPublicKey.toBase58())

      if (!adminWallet || adminPublicKey.toBase58() !== adminWallet) {
        console.error('[UPDATE MINT DEBUG] Unauthorized admin wallet')
        throw new Error('Only the authorized admin wallet can update mint')
      }

      // Create metadata JSON
      const metadata: ReitMetadata = {
        name,
        symbol,
        description,
        attributes: [
          {
            trait_type: 'share_price',
            value: sharePrice,
          },
          {
            trait_type: 'currency',
            value: currency,
          },
        ],
      }

      console.log('[UPDATE MINT DEBUG] Created metadata:', metadata)

      // Upload metadata to Supabase Storage with timestamp version to bypass CDN caching
      console.log('[UPDATE MINT DEBUG] Uploading metadata to Supabase Storage...')
      const timestamp = Math.floor(Date.now() / 1000); // Use timestamp as version
      const metadataUri = await uploadReitMetadataToSupabase(metadata, reitId, timestamp)
      console.log('[UPDATE MINT DEBUG] Metadata uploaded to:', metadataUri)

      // Derive the fundraiser PDA
      const programId = new PublicKey(CLUSTER_CONFIG.programId)
      const reitIdHash = uuidParse(reitId) as Uint8Array
      const [fundraiserPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('fundraiser'), Buffer.from(reitIdHash)],
        programId
      )
      console.log('[UPDATE MINT DEBUG] Fundraiser PDA:', fundraiserPda.toBase58())

      // Get the metadata PDA for the mint
      const metadataPda = await getMetadataPdaForMint(mintAddress)
      console.log('[UPDATE MINT DEBUG] Metadata PDA:', metadataPda)
      console.log('[UPDATE MINT DEBUG] New metadata URI:', metadataUri)

      // Build the on-chain update instruction
      console.log('[UPDATE MINT DEBUG] Building on-chain update instruction...')
      const metadataAccount = new PublicKey(metadataPda)
      const mintPubkey = new PublicKey(mintAddress)
      
      const updateInstruction = await getUpdateReitMintInstructionAsync({
        admin: signer,
        fundraiser: fundraiserPda.toBase58() as Address,
        reitMint: mintPubkey.toBase58() as Address,
        metadata: metadataAccount.toBase58() as Address,
        reitIdHash: new Uint8Array(reitIdHash),
        name,
        symbol,
        metadataUri,
      })

      // Send the update instruction
      console.log('[UPDATE MINT DEBUG] Sending update instruction...')
      const sig = await signAndSend(updateInstruction, signer)
      console.log('[UPDATE MINT DEBUG] Update instruction sent, signature:', sig)
      console.log('[UPDATE MINT DEBUG] Transaction status will be checked via the recovery hook')

      return metadataUri
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Update mint failed')
    },
  })
}

// Export recovery state for use in consuming components
export function useUpdateReitMintRecovery(metadataPda: string | null) {
  const { pendingTx, isCheckingRecovery, clearPendingTx, checkNow } = useTransactionRecovery(metadataPda)
  
  return {
    pendingTx,
    isCheckingRecovery,
    clearPendingTx,
    checkNow,
  }
}
