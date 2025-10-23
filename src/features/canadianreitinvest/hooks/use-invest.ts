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
import { fetchMaybeInvestor } from '@/generated/accounts/investor'

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
      const seedBuffer = Buffer.from(reitIdHash)
      console.debug('INVEST DEBUG: programId=', programId.toBase58())
      console.debug('INVEST DEBUG: reitIdHash (hex)=', seedBuffer.toString('hex'))
      const [fundraiserPda] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), seedBuffer],
        programId
      )
      console.debug('INVEST DEBUG: derived fundraiserPda=', fundraiserPda.toBase58())

      // Step 2: Fetch fundraiser account
      const fundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      if (!fundraiserAccount?.exists) {
        console.error('Fundraiser account does not exist at', fundraiserPda.toBase58())
        throw new Error('Fundraiser not found')
      }

      const fundraiser = fundraiserAccount.data
      console.debug('INVEST DEBUG: fundraiser.usdcMint=', fundraiser.usdcMint)
      console.debug('INVEST DEBUG: fundraiser.escrowVault=', fundraiser.escrowVault)

      // Step 3: Derive investor PDA and fetch investor account
      const [investorPda] = await PublicKey.findProgramAddress(
        [Buffer.from('investor'), investorPublicKey.toBuffer()],
        programId
      )
      console.debug('INVEST DEBUG: derived investorPda=', investorPda.toBase58())

      const investorAccount = await fetchMaybeInvestor(
        client.rpc,
        investorPda.toBase58() as Address
      )

      // Investor account must already exist; it's initialized via initialize_investor instruction
      if (!investorAccount?.exists) {
        console.error('Investor account does not exist at', investorPda.toBase58())
        throw new Error('Investor account not initialized. Please call initialize_investor first.')
      }

      const investmentCounter = investorAccount.data.investmentCounter
      console.debug('INVEST DEBUG: found investor account, counter=', investmentCounter.toString())

      // Step 4: Derive investment PDA using investor's counter
      const investmentCounterBuf = Buffer.alloc(8)
      investmentCounterBuf.writeBigUInt64LE(investmentCounter)

      const [investmentPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('investment'),
          investorPublicKey.toBuffer(),
          investmentCounterBuf,
        ],
        programId
      )
      console.debug('INVEST DEBUG: derived investmentPda=', investmentPda.toBase58())

      // Step 5: Get investor's USDC ATA
      const usdcMint = new PublicKey(fundraiser.usdcMint)
      const investorUsdcAta = getAssociatedTokenAddressSync(usdcMint, investorPublicKey)

      // Step 6: Get escrow vault from fundraiser
      const escrowVault = new PublicKey(fundraiser.escrowVault)

      // Step 7: Build and send invest instruction
      const instruction = await getInvestInstructionAsync({
        investor: signer,
        fundraiser: fundraiserPda.toBase58() as Address,
        investorAccount: investorPda.toBase58() as Address,
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
