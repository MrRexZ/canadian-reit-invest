import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CLUSTER_CONFIG } from '@/lib/cluster-config'
import { PublicKey } from '@solana/web3.js'
import { useWalletUi } from '@wallet-ui/react'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { type Address } from 'gill'
import { getCloseInvestorInstructionAsync } from '@/generated'

export function useCloseInvestor() {
  const { account } = useWalletUi()

  const signer = account ? useWalletUiSigner({ account }) : null
  const signAndSend = useWalletUiSignAndSend()

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!account?.publicKey || !signer) {
        throw new Error('Wallet not connected')
      }

      const investorPublicKey = new PublicKey(account.publicKey)
      const programId = new PublicKey(CLUSTER_CONFIG.programId)

      // Derive investor PDA
      const [investorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('investor'), investorPublicKey.toBuffer()],
        programId
      )

      // Build and send close investor instruction
      const instruction = await getCloseInvestorInstructionAsync({
        signer,
        investor: investorPda.toBase58() as Address,
      })

      const sig = await signAndSend(instruction, signer)
      toast.success('Investor account closed successfully')
      return sig
    },
    onError: (error: any) => {
      toast.error(error instanceof Error ? error.message : 'Failed to close investor account')
    },
  })

  return {
    isClosing: closeMutation.isPending,
    close: () => closeMutation.mutateAsync(),
  }
}
