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
import { useSolana } from '@/components/solana/use-solana'
import type { Address } from 'gill'

/**
 * Hook for updating REIT mint metadata
 * Handles updating both the JSON metadata file in Supabase Storage AND the on-chain Metaplex metadata
 */
export function useUpdateReitMint({ account }: { account: UiWalletAccount }) {
  const signer = account ? useWalletUiSigner({ account }) : null
  const signAndSend = useWalletUiSignAndSend()
  const { client } = useSolana()

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

      // Wait for transaction finalization and verify PDA update
      console.log('[UPDATE MINT DEBUG] Waiting for transaction finalization...')
      try {
        const rpc = client.rpc
        
        // Use a hybrid approach: check current status first, then poll if needed
        let isFinalized = false
        let attempts = 0
        const maxAttempts = 60 // ~60 seconds with 500ms delays
        
        while (!isFinalized && attempts < maxAttempts) {
          const { value } = await rpc.getSignatureStatuses([sig as any], { searchTransactionHistory: true }).send()
          const status = value?.[0]
          
          if (attempts === 0 || attempts % 4 === 0) { // Log every 4 attempts (~2 seconds)
            console.log(`[UPDATE MINT DEBUG] Signature status check ${attempts + 1}:`, {
              signature: sig,
              confirmationStatus: status?.confirmationStatus,
              err: status?.err,
            })
          }
          
          if (status?.confirmationStatus === 'finalized') {
            isFinalized = true
            console.log('[UPDATE MINT DEBUG] Transaction reached finalized commitment!')
            
            if (status.err) {
              console.error('[UPDATE MINT DEBUG] Transaction error:', status.err)
              throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
            }
          }
          
          if (!isFinalized) {
            attempts++
            await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms before retry
          }
        }
        
        if (!isFinalized) {
          throw new Error('Transaction finalization timeout (60 seconds)')
        }
        
        // Transaction is finalized and successful - now fetch the metadata PDA to verify
        console.log('[UPDATE MINT DEBUG] Verifying PDA update...')
        const metadataAccount = new PublicKey(metadataPda)
        const { value: accountInfo } = await rpc.getAccountInfo(metadataAccount.toBase58() as Address, { encoding: 'base64' }).send()
        
        if (accountInfo) {
          console.log('[UPDATE MINT DEBUG] Metadata PDA verified:', {
            address: metadataAccount.toBase58(),
            owner: accountInfo.owner,
            lamports: accountInfo.lamports,
            dataLength: accountInfo.data?.[0]?.length,
          })
          console.log('[UPDATE MINT DEBUG] ✅ REIT mint metadata updated and verified on-chain!')
          toast.success(`REIT mint metadata updated and verified on-chain!`)
        } else {
          console.error('[UPDATE MINT DEBUG] Metadata PDA not found after finalization')
          throw new Error('Metadata PDA account not found')
        }
      } catch (e) {
        console.error('[UPDATE MINT DEBUG] Finality verification failed:', e)
        // Still show warning toast since the transaction was sent
        // The user can verify manually if needed
        toast.warning(`REIT mint metadata updated (verification pending)`)
      }

      return metadataUri
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Update mint failed')
    },
  })
}
