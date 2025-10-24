import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSolana } from '@/components/solana/use-solana'
import { CLUSTER_CONFIG } from '@/lib/cluster-config'
import { PublicKey } from '@solana/web3.js'
import { useWalletUi } from '@wallet-ui/react'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { type Address } from 'gill'
import { getInitializeInvestorInstructionAsync } from '@/generated'
import { fetchMaybeInvestor } from '@/generated/accounts/investor'

export function useInitializeInvestor() {
  const { account } = useWalletUi()
  const { client } = useSolana()

  // Check if investor PDA already exists
  const { data: investorPDA, isLoading: isCheckingPDA, refetch } = useQuery({
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

      // Try to fetch the investor account
      try {
        const investorAccount = await fetchMaybeInvestor(client.rpc, investorPda.toBase58() as Address)
        console.log('Investor account fetch result:', investorAccount)
        // fetchMaybeInvestor returns an object with 'exists' property
        // Only return PDA if account actually exists
        if (investorAccount && 'exists' in investorAccount && investorAccount.exists) {
          return investorPda.toBase58()
        }
        return null
      } catch (error) {
        console.log('Error fetching investor account:', error)
        // If there's any error fetching, account doesn't exist
        return null
      }
    },
    enabled: !!account?.publicKey,
    staleTime: 0, // Always fresh
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

      // Build and send initialize investor instruction
      const instruction = await getInitializeInvestorInstructionAsync({
        signer,
        investor: investorPda.toBase58() as Address,
      })

      const sig = await signAndSend(instruction, signer)
      toast.success('Investor account initialized successfully')
      return sig
    },
    onSuccess: () => {
      // Refetch immediately to confirm the account was created
      refetch()
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
