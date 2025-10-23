import { useMutation } from '@tanstack/react-query'
import { getInvestInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { UiWalletAccount } from '@wallet-ui/react'
import { Address } from 'gill'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { useSolana } from '@/components/solana/use-solana'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'

export function useInvest({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client } = useSolana()

  return useMutation({
    mutationFn: async ({ amount, reitIdHash }: { amount: number; reitIdHash: Uint8Array }) => {
      if (!account?.publicKey) throw new Error('Wallet not connected')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const investorPublicKey = new PublicKey(account.publicKey)

      // Step 1: Derive fundraiser PDA from reit_id_hash
      const [fundraiserPda] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), Buffer.from(reitIdHash)],
        programId
      )

      // Step 2: Fetch fundraiser account
      const fundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      if (!fundraiserAccount?.exists) throw new Error('Fundraiser not found')

      const fundraiser = fundraiserAccount.data

      // Step 3: Derive investment PDA using investment_counter
      const investmentCounter = fundraiser.investmentCounter
      const investmentCounterBuf = Buffer.alloc(8)
      investmentCounterBuf.writeBigUInt64LE(investmentCounter)

      const [investmentPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('investment'),
          investorPublicKey.toBuffer(),
          fundraiserPda.toBuffer(),
          investmentCounterBuf,
        ],
        programId
      )

      // Step 4: Get investor's USDC ATA
      const usdcMint = new PublicKey(fundraiser.usdcMint)
      const investorUsdcAta = getAssociatedTokenAddressSync(usdcMint, investorPublicKey)

      // Step 5: Get escrow vault from fundraiser
      const escrowVault = new PublicKey(fundraiser.escrowVault)

      // Step 6: Build and send invest instruction
      const instruction = await getInvestInstructionAsync({
        investor: signer,
        fundraiser: fundraiserPda.toBase58() as Address,
        investment: investmentPda.toBase58() as Address,
        investorUsdcAta: investorUsdcAta.toBase58() as Address,
        escrowVault: escrowVault.toBase58() as Address,
        amount: BigInt(amount),
        reitIdHash: reitIdHash as unknown as Uint8Array,
      })

      const sig = await signAndSend(instruction, signer)
      toast.success('Investment submitted')
      return sig
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Investment failed')
    },
  })
}
