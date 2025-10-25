import { useMutation } from '@tanstack/react-query'
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

  return useMutation({
    mutationFn: async ({ investmentPda, reitId }: { investmentPda: string; reitId: string }) => {
      if (!account?.publicKey) throw new Error('Wallet not connected')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const adminPublicKey = new PublicKey(account.publicKey)

      // Parse reitId back to bytes for reitIdHash
      const reitIdHash = uuidParse(reitId) as Uint8Array

      // Derive fundraiser PDA from reitIdHash
      const seedBuffer = Buffer.from(reitIdHash)
      const [fundraiserPda] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), seedBuffer],
        programId
      )

      // Fetch fundraiser account to get USDC mint and escrow vault
      const fundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      if (!fundraiserAccount?.exists) {
        throw new Error('Fundraiser not found')
      }

      const fundraiser = fundraiserAccount.data

      // Fetch investment account to verify it exists and get details
      const investmentAccount = await fetchMaybeInvestment(
        client.rpc,
        investmentPda as Address
      )
      if (!investmentAccount?.exists) {
        throw new Error('Investment not found')
      }

      const investment = investmentAccount.data

      // Verify investment status is pending
      if (investment.status !== 0) { // 0 = Pending
        throw new Error('Investment is not in pending status')
      }

      // Verify admin is the authorized admin wallet and fundraiser admin
      const adminWallet = import.meta.env.VITE_ADMIN_WALLET
      if (!adminWallet || adminPublicKey.toBase58() !== adminWallet) {
        throw new Error('Only the authorized admin wallet can release investments')
      }
      if (fundraiser.admin !== adminPublicKey.toBase58()) {
        throw new Error('Signer is not the fundraiser admin')
      }

      // Get admin's USDC ATA
      const usdcMint = new PublicKey(fundraiser.usdcMint)
      const adminUsdcAta = getAssociatedTokenAddressSync(usdcMint, adminPublicKey)

      // Get escrow vault
      const escrowVault = new PublicKey(fundraiser.escrowVault)

      // Build release instruction
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

      const sig = await signAndSend(instruction, signer)
      toast.success('Investment released successfully')

      return sig
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Release failed')
    },
  })
}