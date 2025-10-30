import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvestInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { UiWalletAccount } from '@wallet-ui/react'
import { Address } from 'gill'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useSolana } from '@/components/solana/use-solana'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { fetchMaybeInvestorFundraiser } from '@/generated/accounts/investorFundraiser'
import { supabase } from '@/lib/supabase'
import { deriveInvestorFundraiserPda, deriveInvestmentPda } from '@/lib/pda-utils'
import { getSolanaExplorerUrl } from '@/lib/cluster-endpoints'

export function useInvest({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client, cluster } = useSolana()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ amount, reitIdHash, reitId, userId }: { amount: number; reitIdHash: Uint8Array; reitId: string; userId: string }) => {
      console.log('=== INVEST MUTATION START ===')
      console.log('[INVEST] Input parameters:', {
        amount,
        reitId,
        userId,
        reitIdHash: Array.from(reitIdHash),
        reitIdHashLength: reitIdHash.length,
      })

      if (!account?.publicKey) throw new Error('Wallet not connected')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const investorPublicKey = new PublicKey(account.publicKey)

      console.log('[INVEST] Program and wallet info:', {
        programId: programId.toBase58(),
        investorPublicKey: investorPublicKey.toBase58(),
        programAddress: CANADIANREITINVEST_PROGRAM_ADDRESS,
      })

      // Step 1: Derive fundraiser PDA from reit_id_hash
      const seedBuffer = Buffer.from(reitIdHash)
      console.log('[INVEST] Fundraiser PDA derivation:', {
        seed1: 'fundraiser',
        seed2Hex: seedBuffer.toString('hex'),
        seed2Length: seedBuffer.length,
        seed2Bytes: Array.from(seedBuffer),
      })

      const [fundraiserPda, fundraiserBump] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), seedBuffer],
        programId
      )
      console.log('[INVEST] Derived fundraiser PDA:', {
        address: fundraiserPda.toBase58(),
        bump: fundraiserBump,
      })

      // Step 2: Fetch fundraiser account
      console.log('[INVEST] Fetching fundraiser account from chain...')
      const fundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      console.log('[INVEST] Fundraiser account fetch result:', {
        exists: fundraiserAccount?.exists,
        address: fundraiserAccount?.address,
      })

      if (!fundraiserAccount?.exists) {
        console.error('[INVEST ERROR] Fundraiser account does not exist at', fundraiserPda.toBase58())
        throw new Error('Fundraiser not found')
      }

      const fundraiser = fundraiserAccount.data
      console.log('[INVEST] Fundraiser account data:', {
        usdcMint: fundraiser.usdcMint,
        escrowVault: fundraiser.escrowVault,
        totalRaised: fundraiser.totalRaised?.toString(),
        bump: fundraiser.bump,
      })

      // Step 3: Get investor's USDC ATA
      const usdcMint = new PublicKey(fundraiser.usdcMint)
      console.log('[INVEST] USDC mint info:', {
        usdcMintFromFundraiser: fundraiser.usdcMint,
        usdcMintPubkey: usdcMint.toBase58(),
      })

      const investorUsdcAta = getAssociatedTokenAddressSync(usdcMint, investorPublicKey)
      console.log('[INVEST] Investor USDC ATA:', {
        address: investorUsdcAta.toBase58(),
      })

      // Step 4: We no longer require the frontend to pre-create the USDC ATA.
      // The program will create the associated token account if it's missing (init_if_needed).
      // We'll still pass the derived ATA address to the instruction so the program can initialize it.
      // (No client-side existence check required.)

      // Step 5: Derive investor PDA (will be created by init_if_needed in the invest instruction)
      const [investorPda, investorBump] = await PublicKey.findProgramAddress(
        [Buffer.from('investor'), investorPublicKey.toBuffer()],
        programId
      )
      console.log('[INVEST] Investor PDA derivation:', {
        address: investorPda.toBase58(),
        bump: investorBump,
        seeds: ['investor', investorPublicKey.toBase58()],
      })

      // Step 6: Derive InvestorFundraiser PDA and fetch current counter
      const [investorFundraiserPda, investorFundraiserBump] = deriveInvestorFundraiserPda(investorPublicKey, fundraiserPda)
      console.log('[INVEST] InvestorFundraiser PDA derivation:', {
        address: investorFundraiserPda.toBase58(),
        bump: investorFundraiserBump,
        seeds: ['investor_fundraiser', investorPublicKey.toBase58(), fundraiserPda.toBase58()],
      })

      console.log('[INVEST] Fetching InvestorFundraiser account from chain...')
      const investorFundraiserAccount = await fetchMaybeInvestorFundraiser(
        client.rpc,
        investorFundraiserPda.toBase58() as Address
      )
      console.log('[INVEST] InvestorFundraiser account fetch result:', {
        exists: investorFundraiserAccount?.exists,
        address: investorFundraiserAccount?.address,
      })

      // Get current counter for this fundraiser (0 if InvestorFundraiser account doesn't exist yet)
      const currentCounter = investorFundraiserAccount?.exists
        ? Number(investorFundraiserAccount.data.investmentCounter)
        : 0
      console.log('[INVEST] Investment counter for this fundraiser:', {
        currentCounter,
        accountExists: investorFundraiserAccount?.exists,
      })

      // Step 7: Derive investment PDA using the per-fundraiser counter
      const [investmentPda, investmentBump] = deriveInvestmentPda(investorPublicKey, fundraiserPda, currentCounter)
      console.log('[INVEST] Investment PDA derivation:', {
        address: investmentPda.toBase58(),
        bump: investmentBump,
        counter: currentCounter,
        seeds: ['investment', investorPublicKey.toBase58(), fundraiserPda.toBase58(), currentCounter],
      })

      // Step 7: Get escrow vault from fundraiser
      const escrowVault = new PublicKey(fundraiser.escrowVault)
      console.log('[INVEST] Escrow vault:', {
        address: escrowVault.toBase58(),
      })

      // Step 8: Build and send invest instruction
      console.log('[INVEST] Building invest instruction with accounts:', {
        investorSigner: account.publicKey,
        investor: investorPda.toBase58(),
        investorFundraiser: investorFundraiserPda.toBase58(),
        fundraiser: fundraiserPda.toBase58(),
        investment: investmentPda.toBase58(),
        investorUsdcAta: investorUsdcAta.toBase58(),
        usdcMint: usdcMint.toBase58(),
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
        escrowVault: escrowVault.toBase58(),
        amount: amount.toString(),
        reitIdHash: Array.from(reitIdHash),
      })

      const instruction = await getInvestInstructionAsync({
        investorSigner: signer,
        investor: investorPda.toBase58() as Address,
        investorFundraiser: investorFundraiserPda.toBase58() as Address,
        fundraiser: fundraiserPda.toBase58() as Address,
        investment: investmentPda.toBase58() as Address,
        investorUsdcAta: investorUsdcAta.toBase58() as Address,
        usdcMint: usdcMint.toBase58() as Address,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID.toBase58() as Address,
        escrowVault: escrowVault.toBase58() as Address,
        amount: BigInt(amount),
        reitIdHash: reitIdHash as unknown as Uint8Array,
        counter: BigInt(currentCounter),
      })

      console.log('[INVEST] Instruction built successfully, sending transaction...')
      const sig = await signAndSend(instruction, signer)
      console.log('[INVEST] Transaction sent with signature:', sig)
      
      // Show success toast with explorer link
      const explorerUrl = getSolanaExplorerUrl(sig, cluster.id, 'tx')
      toast.success('Investment submitted', {
        action: {
          label: 'View on Explorer',
          onClick: () => window.open(explorerUrl, '_blank'),
        },
      })

      // Wait for transaction to be confirmed before completing mutation
      console.log('[INVEST] Waiting for transaction confirmation...')
      let confirmationStatus = null
      let retries = 0
      const maxRetries = 30 // ~30 seconds with 1 second polling

      while (retries < maxRetries) {
        try {
          const signatureStatus = await client.rpc.getSignatureStatuses([sig as any]).send()
          const status = signatureStatus.value?.[0]

          console.log(`[INVEST] Confirmation check attempt ${retries + 1}/${maxRetries}:`, {
            status: status?.confirmationStatus,
            err: status?.err,
          })

          if (status?.err) {
            console.error('[INVEST ERROR] Transaction failed with error:', status.err)
            throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
          }

          if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
            confirmationStatus = status.confirmationStatus
            console.log(`[INVEST] ✓ Transaction confirmed at "${confirmationStatus}" commitment level`)
            break
          }

          retries++
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
          }
        } catch (statusError) {
          console.warn('[INVEST] Error checking transaction status:', statusError)
          retries++
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      if (!confirmationStatus) {
        console.error('[INVEST ERROR] Transaction confirmation timeout - did not reach confirmed status within 30 seconds')
        throw new Error('Transaction confirmation timeout. The investment may not have been created.')
      }

      // Insert investment record into Supabase for atomicity
      console.log('[INVEST] Inserting investment record into Supabase...')
      try {
        const { error: dbError } = await supabase
          .from('investments')
          .insert({
            investment_pda: investmentPda.toBase58(),
            investor_user_id: userId,
            reit_id: reitId,
          })

        if (dbError) {
          console.error('[INVEST ERROR] Failed to insert investment into database:', dbError)
          // Note: Onchain transaction succeeded, but DB insert failed
          // This is a rare case that may require manual reconciliation
          toast.error('Investment created onchain but database update failed. Please contact support.')
        } else {
          console.log('[INVEST] ✓ Investment record inserted into database successfully')
          // Invalidate investments query to trigger UI update
          queryClient.invalidateQueries({ queryKey: ['investments'] })
        }
      } catch (dbErr) {
        console.error('[INVEST ERROR] Exception during database insertion:', dbErr)
        toast.error('Investment created onchain but database update failed. Please contact support.')
      }

      console.log('[INVEST] ==> Investment flow completed successfully')
      console.log('=== INVEST MUTATION END ===')
      return sig
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch for all users
      queryClient.invalidateQueries({ queryKey: ['investments'] })
      queryClient.invalidateQueries({ queryKey: ['fundraiser'] })
    },
    onError: (err) => {
      console.error('[INVEST ERROR] Mutation failed:', err)
      console.error('[INVEST ERROR] Error stack:', err instanceof Error ? err.stack : 'No stack trace')
      console.log('=== INVEST MUTATION END (ERROR) ===')
      toast.error(err instanceof Error ? err.message : 'Investment failed')
    },
  })
}
