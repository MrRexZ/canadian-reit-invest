import { useMutation } from '@tanstack/react-query'
import { getIssueShareInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { UiWalletAccount } from '@wallet-ui/react'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { useSolana } from '@/components/solana/use-solana'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { fetchMaybeInvestment } from '@/generated/accounts/investment'
import { Address } from 'gill'
import { parse as uuidParse } from 'uuid'

export function useIssueShare({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client } = useSolana()

  return useMutation({
    mutationFn: async ({ investmentPda, reitId }: { investmentPda: string; reitId: string }) => {
      if (!account?.publicKey) throw new Error('Wallet not connected')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const adminPublicKey = new PublicKey(account.publicKey)

      console.log('[ISSUE SHARE DEBUG] Starting issue share process')
      console.log('[ISSUE SHARE DEBUG] Investment PDA:', investmentPda)
      console.log('[ISSUE SHARE DEBUG] REIT ID:', reitId)
      console.log('[ISSUE SHARE DEBUG] Admin public key:', adminPublicKey.toBase58())

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
      const [investorAta] = await PublicKey.findProgramAddress(
        [
          investorPubkey.toBuffer(),
          new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
          reitMintPubkey.toBuffer(),
        ],
        new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
      )
      console.log('[ISSUE SHARE DEBUG] Investor ATA:', investorAta.toBase58())

      // Build issue share instruction
      console.log('[ISSUE SHARE DEBUG] Building issue share instruction...')
      const instruction = await getIssueShareInstructionAsync({
        admin: signer,
        fundraiser: fundraiserPda.toBase58() as Address,
        investment: investmentPda as Address,
        reitMint: reitMintPubkey.toBase58() as Address,
        investorAta: investorAta.toBase58() as Address,
        reitIdHash: reitIdHash,
      })
      console.log('[ISSUE SHARE DEBUG] Issue share instruction built successfully')

      console.log('[ISSUE SHARE DEBUG] Sending transaction...')
      const sig = await signAndSend(instruction, signer)
      console.log('[ISSUE SHARE DEBUG] Transaction sent successfully!')
      console.log('[ISSUE SHARE DEBUG] Transaction signature:', sig)
      console.log('[ISSUE SHARE DEBUG] Transaction URL:', `https://explorer.solana.com/tx/${sig}?cluster=localnet`)

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

      toast.success(`Shares issued successfully! TX: ${sig.slice(0, 8)}...${sig.slice(-8)}`)

      return sig
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Issue share failed')
    },
  })
}