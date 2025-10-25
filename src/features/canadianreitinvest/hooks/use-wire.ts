import { useMutation } from '@tanstack/react-query'
import { getWireInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { UiWalletAccount } from '@wallet-ui/react'
import { Address } from 'gill'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { useSolana } from '@/components/solana/use-solana'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { fetchMaybeInvestment } from '@/generated/accounts/investment'
import { parse as uuidParse } from 'uuid'

export function useWire({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client } = useSolana()

  return useMutation({
    mutationFn: async ({ investmentPda, reitId }: { investmentPda: string; reitId: string }) => {
      if (!account?.publicKey) throw new Error('Wallet not connected')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const adminPublicKey = new PublicKey(account.publicKey)

      console.log('[WIRE DEBUG] Starting wire process')
      console.log('[WIRE DEBUG] Investment PDA:', investmentPda)
      console.log('[WIRE DEBUG] REIT ID:', reitId)
      console.log('[WIRE DEBUG] Admin public key:', adminPublicKey.toBase58())

      // Parse reitId back to bytes for reitIdHash
      const reitIdHash = new Uint8Array(uuidParse(reitId) as Uint8Array)
      console.log('[WIRE DEBUG] REIT ID hash (bytes):', reitIdHash)
      console.log('[WIRE DEBUG] REIT ID hash (hex):', Buffer.from(reitIdHash).toString('hex'))

      // Derive fundraiser PDA from reitIdHash
      const seedBuffer = Buffer.from(reitIdHash)
      const [fundraiserPda] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), seedBuffer],
        programId
      )
      console.log('[WIRE DEBUG] Derived fundraiser PDA:', fundraiserPda.toBase58())

      // Fetch fundraiser account to verify admin
      const fundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      if (!fundraiserAccount?.exists) {
        console.error('[WIRE DEBUG] Fundraiser account does not exist at:', fundraiserPda.toBase58())
        throw new Error('Fundraiser not found')
      }

      const fundraiser = fundraiserAccount.data
      console.log('[WIRE DEBUG] Fundraiser admin:', fundraiser.admin)

      // Fetch investment account to verify it exists and get details
      const investmentAccount = await fetchMaybeInvestment(
        client.rpc,
        investmentPda as Address
      )
      if (!investmentAccount?.exists) {
        console.error('[WIRE DEBUG] Investment account does not exist at:', investmentPda)
        throw new Error('Investment not found')
      }

      const investment = investmentAccount.data
      console.log('[WIRE DEBUG] Investment account data:', {
        investor: investment.investor,
        fundraiser: investment.fundraiser,
        usdcAmount: investment.usdcAmount,
        reitAmount: investment.reitAmount,
        status: investment.status,
      })

      // Verify investment status is released
      if (investment.status !== 1) { // 1 = Released
        console.error('[WIRE DEBUG] Investment status is not released. Current status:', investment.status)
        throw new Error('Investment is not in released status')
      }

      // Verify admin is the authorized admin wallet and fundraiser admin
      const adminWallet = import.meta.env.VITE_ADMIN_WALLET
      console.log('[WIRE DEBUG] Expected admin wallet from env:', adminWallet)
      console.log('[WIRE DEBUG] Current signer:', adminPublicKey.toBase58())

      if (!adminWallet || adminPublicKey.toBase58() !== adminWallet) {
        console.error('[WIRE DEBUG] Unauthorized admin wallet')
        throw new Error('Only the authorized admin wallet can wire investments')
      }
      if (fundraiser.admin !== adminPublicKey.toBase58()) {
        console.error('[WIRE DEBUG] Signer is not the fundraiser admin')
        throw new Error('Signer is not the fundraiser admin')
      }

      // Build wire instruction
      console.log('[WIRE DEBUG] Building wire instruction...')
      const instruction = await getWireInstructionAsync({
        admin: signer,
        fundraiser: fundraiserPda.toBase58() as Address,
        investment: investmentPda as Address,
        reitIdHash: reitIdHash,
      })
      console.log('[WIRE DEBUG] Wire instruction built successfully')

      console.log('[WIRE DEBUG] Sending transaction...')
      const sig = await signAndSend(instruction, signer)
      console.log('[WIRE DEBUG] Transaction sent successfully!')
      console.log('[WIRE DEBUG] Transaction signature:', sig)
      console.log('[WIRE DEBUG] Transaction URL:', `https://explorer.solana.com/tx/${sig}?cluster=localnet`)

      // Verify the transaction was successful by checking updated investment status
      console.log('[WIRE DEBUG] Verifying transaction results...')
      const updatedInvestmentAccount = await fetchMaybeInvestment(
        client.rpc,
        investmentPda as Address
      )
      if (updatedInvestmentAccount?.exists) {
        const updatedInvestment = updatedInvestmentAccount.data
        console.log('[WIRE DEBUG] Investment status after wire:', updatedInvestment.status)
        if (updatedInvestment.status !== 3) { // 3 = Wired
          console.warn('[WIRE DEBUG] WARNING: Investment status was not updated to Wired')
        }
      }

      console.log('[WIRE DEBUG] Transaction verification complete')

      toast.success(`Investment wired successfully! TX: ${sig.slice(0, 8)}...${sig.slice(-8)}`)

      return sig
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Wire failed')
    },
  })
}