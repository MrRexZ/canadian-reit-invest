import { getInitializeFundraiserInstructionAsync } from '@/generated'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UiWalletAccount, useWalletUiSignAndSend, useWalletUiSigner } from '@wallet-ui/react-gill'
import { toastTx } from '@/components/toast-tx'
import { PublicKey } from '@solana/web3.js'
import { Address } from 'gill'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4, parse as uuidParse } from 'uuid'

export function useInitializeFundraiserMutation({ account }: { account: UiWalletAccount }) {
  const txSigner = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()

  return useMutation({
    mutationFn: async ({ reitName, usdcMint }: { reitName: string; usdcMint: PublicKey }) => {
      // Generate UUID string and parse to bytes
      const uuid = uuidv4()
      const reitIdHash = uuidParse(uuid)

      // Insert into Supabase
      const { error: dbError } = await supabase
        .from('reits')
        .insert({ id: uuid, reit_name: reitName })

      if (dbError) {
        throw new Error(`Failed to create REIT in database: ${dbError.message}`)
      }

      // Derive PDAs using the UUID bytes as seed
      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)

      const [fundraiserPda] = await PublicKey.findProgramAddress([
        Buffer.from('fundraiser'),
        Buffer.from(reitIdHash),
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
        reitId: uuid,
        reitIdHash: reitIdHash as unknown as Uint8Array,
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
