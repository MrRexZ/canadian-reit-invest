import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getIssueDividendInstruction } from '@/generated/instructions'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { UiWalletAccount } from '@wallet-ui/react'
import { Address } from 'gill'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { useSolana } from '@/components/solana/use-solana'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { fetchMaybeInvestment } from '@/generated/accounts/investment'
import { getSolanaExplorerUrl } from '@/lib/cluster-endpoints'

/**
 * V1 Simple Dividend Distribution Hook
 * Transfers USDC from admin ATA to investor ATA
 * No on-chain dividend PDAs created - relies on Solana explorer for audit trail
 */
export function useIssueDividend({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client, cluster } = useSolana()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      investmentPda, 
      amountUSDC 
    }: { 
      investmentPda: string
      amountUSDC: number
    }) => {
      console.log('=== ISSUE DIVIDEND MUTATION START ===')
      console.log('[DIVIDEND] Input parameters:', {
        investmentPda,
        amountUSDC,
      })

      if (!account?.publicKey) throw new Error('Wallet not connected')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const adminPublicKey = new PublicKey(account.publicKey)
      const investmentPdaPubkey = new PublicKey(investmentPda)

      console.log('[DIVIDEND] Admin and program info:', {
        adminPublicKey: adminPublicKey.toBase58(),
        programId: programId.toBase58(),
      })

      // Fetch investment account
      console.log('[DIVIDEND] Fetching investment account...')
      const investmentAccount = await fetchMaybeInvestment(
        client.rpc,
        investmentPda as Address
      )
      
      if (!investmentAccount?.exists) {
        console.error('[DIVIDEND ERROR] Investment account does not exist at', investmentPda)
        throw new Error('Investment not found')
      }

      const investment = investmentAccount.data
      console.log('[DIVIDEND] Investment account data:', {
        investor: investment.investor,
        fundraiser: investment.fundraiser,
        usdcAmount: investment.usdcAmount?.toString(),
        status: investment.status,
      })

      // Fetch fundraiser account
      const fundraiserPda = new PublicKey(investment.fundraiser)
      console.log('[DIVIDEND] Fetching fundraiser account...')
      const fundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        investment.fundraiser as Address
      )

      if (!fundraiserAccount?.exists) {
        console.error('[DIVIDEND ERROR] Fundraiser account does not exist at', investment.fundraiser)
        throw new Error('Fundraiser not found')
      }

      const fundraiser = fundraiserAccount.data
      console.log('[DIVIDEND] Fundraiser account data:', {
        admin: fundraiser.admin,
        usdcMint: fundraiser.usdcMint,
      })

      // Validate admin is fundraiser admin
      if (adminPublicKey.toBase58() !== fundraiser.admin) {
        console.error('[DIVIDEND ERROR] Admin does not match fundraiser admin')
        throw new Error('Unauthorized: You are not the fundraiser admin')
      }

      const usdcMint = new PublicKey(fundraiser.usdcMint)
      const investor = new PublicKey(investment.investor)

      // Get admin USDC ATA
      const adminUsdcAta = getAssociatedTokenAddressSync(usdcMint, adminPublicKey)
      console.log('[DIVIDEND] Admin USDC ATA:', {
        address: adminUsdcAta.toBase58(),
      })

      // Get investor USDC ATA
      const investorUsdcAta = getAssociatedTokenAddressSync(usdcMint, investor)
      console.log('[DIVIDEND] Investor USDC ATA:', {
        address: investorUsdcAta.toBase58(),
        investor: investor.toBase58(),
      })

      // Convert USDC amount to smallest unit (6 decimals)
      const amountInSmallestUnit = Math.floor(amountUSDC * 1_000_000)
      console.log('[DIVIDEND] Amount conversion:', {
        uiAmount: amountUSDC,
        smallestUnit: amountInSmallestUnit,
        decimals: 6,
      })

      // Build instruction
      console.log('[DIVIDEND] Building dividend instruction with accounts:', {
        admin: adminPublicKey.toBase58(),
        investment: investmentPdaPubkey.toBase58(),
        investor: investor.toBase58(),
        fundraiser: fundraiserPda.toBase58(),
        adminUsdcAta: adminUsdcAta.toBase58(),
        investorUsdcAta: investorUsdcAta.toBase58(),
        usdcMint: usdcMint.toBase58(),
        amount: amountInSmallestUnit,
      })

      const instruction = getIssueDividendInstruction({
        admin: signer,
        investment: investmentPdaPubkey.toBase58() as Address,
        investor: investor.toBase58() as Address,
        fundraiser: fundraiserPda.toBase58() as Address,
        adminUsdcAta: adminUsdcAta.toBase58() as Address,
        investorUsdcAta: investorUsdcAta.toBase58() as Address,
        usdcMint: usdcMint.toBase58() as Address,
        amount: BigInt(amountInSmallestUnit),
      })

      console.log('[DIVIDEND] Instruction built successfully, sending transaction...')
      const sig = await signAndSend(instruction, signer)
      console.log('[DIVIDEND] Transaction sent with signature:', sig)

      // Wait for transaction confirmation
      console.log('[DIVIDEND] Waiting for transaction confirmation...')
      let confirmationStatus = null
      let retries = 0
      const maxRetries = 30

      while (retries < maxRetries) {
        try {
          const signatureStatus = await client.rpc.getSignatureStatuses([sig as any]).send()
          const status = signatureStatus.value?.[0]

          console.log(`[DIVIDEND] Confirmation check attempt ${retries + 1}/${maxRetries}:`, {
            status: status?.confirmationStatus,
            err: status?.err,
          })

          if (status?.err) {
            console.error('[DIVIDEND ERROR] Transaction failed with error:', status.err)
            throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
          }

          if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
            confirmationStatus = status.confirmationStatus
            console.log(`[DIVIDEND] ✓ Transaction confirmed at "${confirmationStatus}" commitment level`)
            break
          }

          retries++
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (statusError) {
          console.warn('[DIVIDEND] Error checking transaction status:', statusError)
          retries++
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      if (!confirmationStatus) {
        console.error('[DIVIDEND ERROR] Transaction confirmation timeout')
        throw new Error('Transaction confirmation timeout. The dividend may not have been issued.')
      }

      console.log('[DIVIDEND] ==> Dividend issuance completed successfully')
      console.log('[DIVIDEND] Transaction signature:', sig)
      console.log('[DIVIDEND] Audit trail available on Solana explorer')
      console.log('=== ISSUE DIVIDEND MUTATION END ===')
      const explorerUrl = getSolanaExplorerUrl(sig, cluster.id, 'tx')
      return { sig, amount: amountUSDC, investor: investor.toBase58(), explorerUrl }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] })
    },
    onError: (err) => {
      console.error('[DIVIDEND ERROR] Mutation failed:', err)
      console.error('[DIVIDEND ERROR] Error stack:', err instanceof Error ? err.stack : 'No stack trace')
      console.log('=== ISSUE DIVIDEND MUTATION END (ERROR) ===')
      toast.error(err instanceof Error ? err.message : 'Dividend issuance failed')
    },
  })
}
