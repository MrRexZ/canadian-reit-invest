import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getIssueShareInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { UiWalletAccount } from '@wallet-ui/react'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import { useSolana } from '@/components/solana/use-solana'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { fetchMaybeInvestment } from '@/generated/accounts/investment'
import { Address } from 'gill'
import { parse as uuidParse } from 'uuid'
import { getRpcEndpoint, getSolanaExplorerUrl } from '@/lib/cluster-endpoints'
import { getSharePriceFromMetadata } from '@/lib/metaplex-update'

export function useIssueShare({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client, cluster } = useSolana()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ investmentPda, reitId, sharePrice }: { investmentPda: string; reitId: string; sharePrice: number }) => {
      if (!account?.publicKey) throw new Error('Wallet not connected')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const adminPublicKey = new PublicKey(account.publicKey)

      // Parse reitId back to bytes for reitIdHash
      const reitIdHash = new Uint8Array(uuidParse(reitId) as Uint8Array)
      console.log('[ISSUE SHARE DEBUG] REIT ID hash (bytes):', reitIdHash)

      // Derive fundraiser PDA from reitIdHash
      const [fundraiserPda] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), Buffer.from(reitIdHash)],
        programId
      )
      console.log('[ISSUE SHARE DEBUG] Derived fundraiser PDA:', fundraiserPda.toBase58())

      // Fetch fundraiser account to verify admin and get reit_mint
      const fundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      if (!fundraiserAccount?.exists) {
        console.error('[ISSUE SHARE DEBUG] Fundraiser account does not exist at:', fundraiserPda.toBase58())
        throw new Error('Fundraiser not found')
      }

      const fundraiser = fundraiserAccount.data
      console.log('[ISSUE SHARE DEBUG] Fundraiser admin:', fundraiser.admin)
      console.log('[ISSUE SHARE DEBUG] REIT mint:', fundraiser.reitMint)

      if (fundraiser.reitMint === PublicKey.default.toBase58()) {
        throw new Error('REIT mint not created yet')
      }

      // Map cluster ID to RPC endpoint

            // If sharePrice is not provided, fetch it from REIT metadata
      let finalSharePrice = sharePrice;
      if (!finalSharePrice) {
        console.log('[ISSUE SHARE DEBUG] Share price not provided, fetching from metadata...');

        // Fetch share price from Metaplex metadata with RPC endpoint
        const rpcEndpoint = getRpcEndpoint(cluster.id)
        finalSharePrice = await getSharePriceFromMetadata(fundraiser.reitMint, rpcEndpoint);
        console.log('[ISSUE SHARE DEBUG] Fetched share price from metadata:', finalSharePrice);
      }

      // Fetch investment account
      const investmentAccount = await fetchMaybeInvestment(
        client.rpc,
        investmentPda as Address
      )
      if (!investmentAccount?.exists) {
        console.error('[ISSUE SHARE DEBUG] Investment account does not exist at:', investmentPda)
        throw new Error('Investment not found')
      }

      const investment = investmentAccount.data
      console.log('[ISSUE SHARE DEBUG] Investment data:', {
        investor: investment.investor,
        usdcAmount: investment.usdcAmount,
        status: investment.status,
      })

      // Verify investment is in wired status
      if (investment.status !== 3) { // 3 = Wired
        console.error('[ISSUE SHARE DEBUG] Investment status is not wired. Current status:', investment.status)
        throw new Error('Investment is not in wired status')
      }

      // Verify admin is the authorized admin wallet
      const adminWallet = import.meta.env.VITE_ADMIN_WALLET
      console.log('[ISSUE SHARE DEBUG] Expected admin wallet from env:', adminWallet)

      if (!adminWallet || adminPublicKey.toBase58() !== adminWallet) {
        console.error('[ISSUE SHARE DEBUG] Unauthorized admin wallet')
        throw new Error('Only the authorized admin wallet can issue shares')
      }
      if (fundraiser.admin !== adminPublicKey.toBase58()) {
        console.error('[ISSUE SHARE DEBUG] Signer is not the fundraiser admin')
        throw new Error('Signer is not the fundraiser admin')
      }

      // Derive investor ATA for the REIT mint
      const reitMintPubkey = new PublicKey(fundraiser.reitMint)
      const investorPubkey = new PublicKey(investment.investor)
      console.log('[ISSUE SHARE DEBUG] reitMint from fundraiser:', fundraiser.reitMint)
      console.log('[ISSUE SHARE DEBUG] reitMint PublicKey:', reitMintPubkey.toBase58())
      console.log('[ISSUE SHARE DEBUG] fundraiserPda:', fundraiserPda.toBase58())

      // Derive investor PDA
      const [investorPda] = await PublicKey.findProgramAddress(
        [Buffer.from('investor'), investorPubkey.toBuffer()],
        programId
      )
      console.log('[ISSUE SHARE DEBUG] Derived investor PDA:', investorPda.toBase58())

      // Derive investor ATA - now owned by the investor wallet, not the PDA!
      // The Rust constraint is: associated_token::authority = investor_pubkey (the wallet)
      const investorAta = await getAssociatedTokenAddress(
        reitMintPubkey,
        investorPubkey,
        false
      )
      console.log('[ISSUE SHARE DEBUG] Investor ATA (owned by wallet):', investorAta.toBase58())

      // Build issue share instruction
      console.log('[ISSUE SHARE DEBUG] Building issue share instruction...')
      
            // Debug all accounts before building instruction
      console.log('[ISSUE SHARE DEBUG] ========== ACCOUNTS BEING PASSED ==========')
      console.log('[ISSUE SHARE DEBUG] admin (signer):', signer)
      console.log('[ISSUE SHARE DEBUG] fundraiser:', fundraiserPda.toBase58())
      console.log('[ISSUE SHARE DEBUG] investment:', investmentPda)
      console.log('[ISSUE SHARE DEBUG] investor:', investorPda.toBase58())
      console.log('[ISSUE SHARE DEBUG] investorWallet:', investorPubkey.toBase58())
      console.log('[ISSUE SHARE DEBUG] reitMint:', reitMintPubkey.toBase58())
      console.log('[ISSUE SHARE DEBUG] investorAta:', investorAta.toBase58())
      console.log('[ISSUE SHARE DEBUG] tokenProgram:', TOKEN_PROGRAM_ID.toBase58())
      console.log('[ISSUE SHARE DEBUG] investorPubkey (parameter):', investorPubkey.toBase58())
      console.log('[ISSUE SHARE DEBUG] reitIdHash:', reitIdHash)
      console.log('[ISSUE SHARE DEBUG] sharePrice:', finalSharePrice)
      console.log('[ISSUE SHARE DEBUG] programId:', programId.toBase58())
      console.log('[ISSUE SHARE DEBUG] =========================================')
      
      const instruction = await getIssueShareInstructionAsync({
        admin: signer,
        fundraiser: fundraiserPda.toBase58() as Address,
        investment: investmentPda as Address,
        investor: investorPda.toBase58() as Address,
        investorWallet: investorPubkey.toBase58() as Address,
        reitMint: reitMintPubkey.toBase58() as Address,
        investorAta: investorAta.toBase58() as Address,
        tokenProgram: TOKEN_PROGRAM_ID.toBase58() as Address,
        investorPubkey: investorPubkey.toBase58() as Address,
        reitIdHash: reitIdHash,
        sharePrice: finalSharePrice,
      })
      console.log('[ISSUE SHARE DEBUG] Issue share instruction built successfully')
      console.log('[ISSUE SHARE DEBUG] Instruction accounts:', instruction.accounts?.map((acc: any) => ({
        address: typeof acc === 'string' ? acc : acc.address,
        isSigner: typeof acc !== 'string' ? acc.isSigner : undefined,
        isWritable: typeof acc !== 'string' ? acc.isWritable : undefined,
      })))

      console.log('[ISSUE SHARE DEBUG] Sending transaction...')
      const sig = await signAndSend(instruction, signer)
      console.log('[ISSUE SHARE DEBUG] Transaction sent successfully!')
      console.log('[ISSUE SHARE DEBUG] Transaction signature:', sig)
      console.log('[ISSUE SHARE DEBUG] Transaction URL:', `https://explorer.solana.com/tx/${sig}?cluster=localnet`)

      // CRITICAL: Wait for transaction confirmation before proceeding
      console.log('[ISSUE SHARE DEBUG] Waiting for transaction confirmation...')
      let confirmationStatus = null
      let retries = 0
      const maxRetries = 30 // ~30 seconds with 1 second polling

      while (retries < maxRetries) {
        try {
          const signatureStatus = await client.rpc.getSignatureStatuses([sig as any]).send()
          const status = signatureStatus.value?.[0]

          if (status?.err) {
            console.error('[ISSUE SHARE DEBUG] Transaction failed with error:', status.err)
            throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
          }

          if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
            confirmationStatus = status.confirmationStatus
            console.log(`[ISSUE SHARE DEBUG] Transaction confirmed at "${confirmationStatus}" commitment level`)
            break
          }

          retries++
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
          }
        } catch (statusError) {
          console.warn('[ISSUE SHARE DEBUG] Error checking transaction status:', statusError)
          retries++
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      if (!confirmationStatus) {
        console.error('[ISSUE SHARE DEBUG] Transaction confirmation timeout - did not reach confirmed status within 30 seconds')
        throw new Error('Transaction confirmation timeout. The shares may not have been issued.')
      }

      // Verify the transaction was successful
      console.log('[ISSUE SHARE DEBUG] Verifying transaction results...')
      const updatedInvestmentAccount = await fetchMaybeInvestment(
        client.rpc,
        investmentPda as Address
      )
      if (updatedInvestmentAccount?.exists) {
        const updatedInvestment = updatedInvestmentAccount.data
        console.log('[ISSUE SHARE DEBUG] Investment status after issue share:', updatedInvestment.status)
        console.log('[ISSUE SHARE DEBUG] REIT amount issued:', updatedInvestment.reitAmount)
      }

      console.log('[ISSUE SHARE DEBUG] Transaction verification complete')

      // Show success toast with explorer link
      const explorerUrl = getSolanaExplorerUrl(sig, cluster.id, 'tx')
      toast.success('Shares issued successfully', {
        action: {
          label: 'View on Explorer',
          onClick: () => window.open(explorerUrl, '_blank'),
        },
      })

      return sig
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch for all users
      queryClient.invalidateQueries({ queryKey: ['investments'] })
      queryClient.invalidateQueries({ queryKey: ['fundraiser'] })
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Issue share failed')
    },
  })
}