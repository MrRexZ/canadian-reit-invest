import { getInitializeFundraiserInstructionAsync } from '@/generated'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UiWalletAccount, useWalletUiSignAndSend, useWalletUiSigner } from '@wallet-ui/react-gill'
import { toastTx } from '@/components/toast-tx'
import { PublicKey } from '@solana/web3.js'
import { Address } from 'gill'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'

export function useInitializeFundraiserMutation({ account }: { account: UiWalletAccount }) {
  const txSigner = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()

  return useMutation({
    mutationFn: async ({ reitId, usdcMint }: { reitId: string; usdcMint: PublicKey }) => {
      // Derive PDAs using raw bytes to match Anchor's seeds (no length-prefix)
      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const adminPubkey = new PublicKey(txSigner.address)

      const [fundraiserPda] = await PublicKey.findProgramAddress([
        Buffer.from('fundraiser'),
        adminPubkey.toBuffer(),
        Buffer.from(reitId),
      ], programId)

      const [escrowVaultPda] = await PublicKey.findProgramAddress([
        Buffer.from('escrow_vault'),
        fundraiserPda.toBuffer(),
      ], programId)

      const instruction = await getInitializeFundraiserInstructionAsync({
        fundraiser: fundraiserPda.toBase58() as Address,
        admin: txSigner,
        escrowVault: escrowVaultPda.toBase58() as Address,
        usdcMint: usdcMint.toBase58() as Address,
        reitId,
      })

      return await signAndSend(instruction, txSigner)
    },
    onSuccess: (signature) => {
      toastTx(signature)
    },
    onError: (error) => {
      console.error('Full error details:', error)
      toast.error('Failed to initialize fundraiser')
    },
  })
}
