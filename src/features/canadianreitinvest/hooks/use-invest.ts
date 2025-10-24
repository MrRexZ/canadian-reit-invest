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

      // Step 1: Derive investor PDA
      const [investorPda] = await PublicKey.findProgramAddress(
        [Buffer.from('investor'), investorPublicKey.toBuffer()],
        programId
      )
      console.debug('INVEST DEBUG: derived investorPda=', investorPda.toBase58())

      // Step 2: Check if investor PDA exists
      const investorAccount = await client.rpc.getAccountInfo(investorPda.toBase58() as Address)
      if (!investorAccount) {
        throw new Error('Investor account not initialized. Please initialize your investor account first.')
      }

      // Step 3: Derive fundraiser PDA from reit_id_hash
      const seedBuffer = Buffer.from(reitIdHash)
      console.debug('INVEST DEBUG: programId=', programId.toBase58())
      console.debug('INVEST DEBUG: reitIdHash (bytes)=', reitIdHash)
      console.debug('INVEST DEBUG: reitIdHash (hex)=', seedBuffer.toString('hex'))
      console.debug('INVEST DEBUG: seedBuffer.length=', seedBuffer.length)
      const [fundraiserPda] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), seedBuffer],
        programId
      )
      console.debug('INVEST DEBUG: derived fundraiserPda=', fundraiserPda.toBase58())

      // Step 4: Fetch fundraiser account
      const fundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      console.debug('INVEST DEBUG: fundraiserAccount.exists=', fundraiserAccount?.exists)
      if (!fundraiserAccount?.exists) {
        console.error('Fundraiser account does not exist at', fundraiserPda.toBase58())
        throw new Error('Fundraiser not found')
      }

      const fundraiser = fundraiserAccount.data
      try {
        console.debug('INVEST DEBUG: fundraiser.usdcMint=', fundraiser.usdcMint)
        console.debug('INVEST DEBUG: fundraiser.escrowVault=', fundraiser.escrowVault)
      } catch (e) {
        /* ignore if shape unexpected */
      }

      // Step 5: Derive investment PDA using investor's investment_counter (from investor PDA)
      // For now, use counter 0 as a placeholder - on-chain logic will use actual counter
      const investmentCounterBuf = Buffer.alloc(8)
      investmentCounterBuf.writeBigUInt64LE(0n)

      const [investmentPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('investment'),
          investorPublicKey.toBuffer(),
          fundraiserPda.toBuffer(),
          investmentCounterBuf,
        ],
        programId
      )

      // Step 6: Get investor's USDC ATA
      const usdcMint = new PublicKey(fundraiser.usdcMint)
      const investorUsdcAta = getAssociatedTokenAddressSync(usdcMint, investorPublicKey)

      // Step 7: Get escrow vault from fundraiser
      const escrowVault = new PublicKey(fundraiser.escrowVault)

      // Step 8: Build and send invest instruction
      // Note: investorSigner is the signer/authority, investor is the investor PDA
      const instruction = await getInvestInstructionAsync({
        investorSigner: signer,
        investor: investorPda.toBase58() as Address,
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
