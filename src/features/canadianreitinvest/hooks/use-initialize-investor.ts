import { useMutation } from '@tanstack/react-query'
import { getInitializeInvestorInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { UiWalletAccount } from '@wallet-ui/react'
import { Address } from 'gill'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'

export function useInitializeInvestor({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async () => {
      if (!account?.publicKey) throw new Error('Wallet not connected')
      if (!user) throw new Error('User not authenticated')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const investorPublicKey = new PublicKey(account.publicKey)

      // Derive investor PDA
      const [investorPda] = await PublicKey.findProgramAddress(
        [Buffer.from('investor'), investorPublicKey.toBuffer()],
        programId
      )
      console.debug('INITIALIZE_INVESTOR DEBUG: derived investorPda=', investorPda.toBase58())

      // Build and send initialize_investor instruction
      const instruction = await getInitializeInvestorInstructionAsync({
        investor: signer,
        investorAccount: investorPda.toBase58() as Address,
      })

      const sig = await signAndSend(instruction, signer)

      // Update the investor_pda in the users table
      const { error } = await supabase
        .from('users')
        .update({ investor_pda: investorPda.toBase58() })
        .eq('user_id', user.id)

      if (error) {
        console.error('Failed to update investor_pda in users table:', error)
        // Don't throw here as the on-chain transaction succeeded
        // The user can retry updating the database later
      }

      toast.success('Investor account initialized')
      return sig
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to initialize investor account')
    },
  })
}
