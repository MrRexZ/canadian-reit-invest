import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getReleaseInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { UiWalletAccount } from '@wallet-ui/react'
import { Address } from 'gill'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useSolana } from '@/components/solana/use-solana'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { fetchMaybeInvestment } from '@/generated/accounts/investment'
import { parse as uuidParse } from 'uuid'

export function useRelease({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client } = useSolana()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ investmentPda, reitId }: { investmentPda: string; reitId: string }) => {
      if (!account?.publicKey) throw new Error('Wallet not connected')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const adminPublicKey = new PublicKey(account.publicKey)

      console.log('[RELEASE DEBUG] Starting release process')
      console.log('[RELEASE DEBUG] Investment PDA:', investmentPda)
      console.log('[RELEASE DEBUG] REIT ID:', reitId)
      console.log('[RELEASE DEBUG] Admin public key:', adminPublicKey.toBase58())

      // Parse reitId back to bytes for reitIdHash
      const reitIdHash = new Uint8Array(uuidParse(reitId) as Uint8Array)
      console.log('[RELEASE DEBUG] REIT ID hash (bytes):', reitIdHash)
      console.log('[RELEASE DEBUG] REIT ID hash (hex):', Buffer.from(reitIdHash).toString('hex'))

      // Derive fundraiser PDA from reitIdHash
      const seedBuffer = Buffer.from(reitIdHash)
      const [fundraiserPda] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), seedBuffer],
        programId
      )
      console.log('[RELEASE DEBUG] Derived fundraiser PDA:', fundraiserPda.toBase58())

      // Fetch fundraiser account to get USDC mint and escrow vault
      const fundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      if (!fundraiserAccount?.exists) {
        console.error('[RELEASE DEBUG] Fundraiser account does not exist at:', fundraiserPda.toBase58())
        throw new Error('Fundraiser not found')
      }

      const fundraiser = fundraiserAccount.data
      console.log('[RELEASE DEBUG] Fundraiser account data:', {
        admin: fundraiser.admin,
        usdcMint: fundraiser.usdcMint,
        escrowVault: fundraiser.escrowVault,
        totalRaised: fundraiser.totalRaised,
        releasedAmount: fundraiser.releasedAmount,
      })

      // Fetch investment account to verify it exists and get details
      const investmentAccount = await fetchMaybeInvestment(
        client.rpc,
        investmentPda as Address
      )
      if (!investmentAccount?.exists) {
        console.error('[RELEASE DEBUG] Investment account does not exist at:', investmentPda)
        throw new Error('Investment not found')
      }

      const investment = investmentAccount.data
      console.log('[RELEASE DEBUG] Investment account data:', {
        investor: investment.investor,
        fundraiser: investment.fundraiser,
        usdcAmount: investment.usdcAmount,
        reitAmount: investment.reitAmount,
        status: investment.status,
      })

      // Verify investment status is pending
      if (investment.status !== 0) { // 0 = Pending
        console.error('[RELEASE DEBUG] Investment status is not pending. Current status:', investment.status)
        throw new Error('Investment is not in pending status')
      }

      // Verify admin is the authorized admin wallet and fundraiser admin
      const adminWallet = import.meta.env.VITE_ADMIN_WALLET
      console.log('[RELEASE DEBUG] Expected admin wallet from env:', adminWallet)
      console.log('[RELEASE DEBUG] Current signer:', adminPublicKey.toBase58())

      if (!adminWallet || adminPublicKey.toBase58() !== adminWallet) {
        console.error('[RELEASE DEBUG] Unauthorized admin wallet')
        throw new Error('Only the authorized admin wallet can release investments')
      }
      if (fundraiser.admin !== adminPublicKey.toBase58()) {
        console.error('[RELEASE DEBUG] Signer is not the fundraiser admin')
        throw new Error('Signer is not the fundraiser admin')
      }

      // Get admin's USDC ATA
      const usdcMint = new PublicKey(fundraiser.usdcMint)
      const adminUsdcAta = getAssociatedTokenAddressSync(usdcMint, adminPublicKey)
      console.log('[RELEASE DEBUG] USDC mint:', usdcMint.toBase58())
      console.log('[RELEASE DEBUG] Admin USDC ATA:', adminUsdcAta.toBase58())

      // Get escrow vault
      const escrowVault = new PublicKey(fundraiser.escrowVault)
      console.log('[RELEASE DEBUG] Escrow vault:', escrowVault.toBase58())

      // Log the transfer details
      const transferAmount = investment.usdcAmount
      console.log('[RELEASE DEBUG] Transfer details:', {
        amount: transferAmount.toString(),
        from: escrowVault.toBase58(),
        to: adminUsdcAta.toBase58(),
        amountInUSDC: (Number(transferAmount) / 1_000_000).toFixed(6), // Assuming 6 decimals
      })

      // Build release instruction
      console.log('[RELEASE DEBUG] Building release instruction...')
      const instruction = await getReleaseInstructionAsync({
        admin: signer,
        fundraiser: fundraiserPda.toBase58() as Address,
        investment: investmentPda as Address,
        adminUsdcAta: adminUsdcAta.toBase58() as Address,
        usdcMint: usdcMint.toBase58() as Address,
        escrowVault: escrowVault.toBase58() as Address,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID.toBase58() as Address,
        reitIdHash: reitIdHash,
      })
      console.log('[RELEASE DEBUG] Release instruction built successfully')

      console.log('[RELEASE DEBUG] Sending transaction...')
      const sig = await signAndSend(instruction, signer)
      console.log('[RELEASE DEBUG] Transaction sent successfully!')
      console.log('[RELEASE DEBUG] Transaction signature:', sig)
      console.log('[RELEASE DEBUG] Transaction URL:', `https://explorer.solana.com/tx/${sig}?cluster=localnet`)

      // CRITICAL: Wait for transaction confirmation before proceeding
      console.log('[RELEASE DEBUG] Waiting for transaction confirmation...')
      let confirmationStatus = null
      let retries = 0
      const maxRetries = 30 // ~30 seconds with 1 second polling
      
      while (retries < maxRetries) {
        try {
          const signatureStatus = await client.rpc.getSignatureStatuses([sig as any]).send()
          const status = signatureStatus.value?.[0]
          
          if (status?.err) {
            console.error('[RELEASE DEBUG] Transaction failed with error:', status.err)
            throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
          }
          
          if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
            confirmationStatus = status.confirmationStatus
            console.log(`[RELEASE DEBUG] Transaction confirmed at "${confirmationStatus}" commitment level`)
            break
          }
          
          retries++
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
          }
        } catch (statusError) {
          console.warn('[RELEASE DEBUG] Error checking transaction status:', statusError)
          retries++
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }
      
      if (!confirmationStatus) {
        console.error('[RELEASE DEBUG] Transaction confirmation timeout - did not reach confirmed status within 30 seconds')
        throw new Error('Transaction confirmation timeout. The investment may not have been released.')
      }

      // Verify the transaction was successful by checking updated accounts
      console.log('[RELEASE DEBUG] Verifying transaction results...')

      // Check updated investment status
      const updatedInvestmentAccount = await fetchMaybeInvestment(
        client.rpc,
        investmentPda as Address
      )
      if (updatedInvestmentAccount?.exists) {
        const updatedInvestment = updatedInvestmentAccount.data
        console.log('[RELEASE DEBUG] Investment status after release:', updatedInvestment.status)
        if (updatedInvestment.status !== 1) { // 1 = Released
          console.warn('[RELEASE DEBUG] WARNING: Investment status was not updated to Released')
        }
      }

      // Check updated fundraiser released amount
      const updatedFundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      if (updatedFundraiserAccount?.exists) {
        const updatedFundraiser = updatedFundraiserAccount.data
        console.log('[RELEASE DEBUG] Fundraiser released amount after release:', updatedFundraiser.releasedAmount)
        const expectedReleased = fundraiser.releasedAmount + transferAmount
        if (updatedFundraiser.releasedAmount !== expectedReleased) {
          console.warn('[RELEASE DEBUG] WARNING: Fundraiser released amount not updated correctly')
        }
      }

      console.log('[RELEASE DEBUG] Transaction verification complete')

      toast.success(`Investment released successfully! TX: ${sig.slice(0, 8)}...${sig.slice(-8)}`)

      return sig
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch for all users
      queryClient.invalidateQueries({ queryKey: ['investments'] })
      queryClient.invalidateQueries({ queryKey: ['fundraiser'] })
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Release failed')
    },
  })
}