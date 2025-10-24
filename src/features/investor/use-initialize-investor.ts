import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSolana } from '@/components/solana/use-solana'
import { CLUSTER_CONFIG } from '@/lib/cluster-config'
import { PublicKey } from '@solana/web3.js'
import { useWalletUi } from '@wallet-ui/react'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { type Address } from 'gill'
import { getInitializeInvestorInstructionAsync } from '@/generated'

export function useInitializeInvestor() {
  const { account } = useWalletUi()
  const { client } = useSolana()

  // Check if investor PDA already exists
  const { data: investorPDA, isLoading: isCheckingPDA } = useQuery({
    queryKey: ['investor-pda', account?.publicKey],
    queryFn: async () => {
      if (!account?.publicKey) return null

      const investorPublicKey = new PublicKey(account.publicKey)
      const programId = new PublicKey(CLUSTER_CONFIG.programId)

      // Derive investor PDA
      const [investorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('investor'), investorPublicKey.toBuffer()],
        programId
      )

      // Try to fetch the account
      try {
        const accountInfo = await client.rpc.getAccountInfo(investorPda.toBase58() as Address)
        return accountInfo ? investorPda.toBase58() : null
      } catch {
        return null
      }
    },
    enabled: !!account?.publicKey,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const signer = account ? useWalletUiSigner({ account }) : null
  const signAndSend = useWalletUiSignAndSend()

  const initializeMutation = useMutation({
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

      // Check if already exists
      try {
        const accountInfo = await client.rpc.getAccountInfo(investorPda.toBase58() as Address)
        if (accountInfo) {
          throw new Error('Investor PDA already initialized')
        }
      } catch (e: any) {
        if (e.message === 'Investor PDA already initialized') {
          throw e
        }
        // If account doesn't exist, that's fine - we'll create it
      }

      // Build and send initialize investor instruction
      const instruction = await getInitializeInvestorInstructionAsync({
        signer,
        investor: investorPda.toBase58() as Address,
      })

      const sig = await signAndSend(instruction, signer)
      toast.success('Investor account initialized successfully')
      return sig
    },
    onError: (error: any) => {
      toast.error(error instanceof Error ? error.message : 'Failed to initialize investor account')
    },
  })

  return {
    investorPDA,
    isCheckingPDA,
    isInitializing: initializeMutation.isPending,
    initialize: () => initializeMutation.mutateAsync(),
  }
}
