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

    // Debug: print the UUID and parsed bytes used as PDA seed
    console.debug('INIT DEBUG: generated uuid=', uuid)
    console.debug('INIT DEBUG: reitIdHash (bytes)=', reitIdHash)
    console.debug('INIT DEBUG: reitIdHash (hex)=', Buffer.from(reitIdHash).toString('hex'))

      // Derive PDAs using the UUID bytes as seed
      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const seedBuffer = Buffer.from(reitIdHash)
      console.debug('INIT DEBUG: programId=', programId.toBase58())
      console.debug('INIT DEBUG: seedBuffer(hex)=', seedBuffer.toString('hex'))
      console.debug('INIT DEBUG: seedBuffer.length=', seedBuffer.length)
      const [fundraiserPda] = await PublicKey.findProgramAddress([
        Buffer.from('fundraiser'),
        seedBuffer,
      ], programId)
      console.debug('INIT DEBUG: derived fundraiserPda=', fundraiserPda.toBase58())

      const [escrowVaultPda] = await PublicKey.findProgramAddress([
        Buffer.from('escrow_vault'),
        fundraiserPda.toBuffer(),
      ], programId)
      console.debug('INIT DEBUG: derived escrowVaultPda=', escrowVaultPda.toBase58())

      const instruction = await getInitializeFundraiserInstructionAsync({
        fundraiser: fundraiserPda.toBase58() as Address,
        admin: txSigner,
        escrowVault: escrowVaultPda.toBase58() as Address,
        usdcMint: usdcMint.toBase58() as Address,
        reitId: uuid,
        reitIdHash: reitIdHash as unknown as Uint8Array,
      })

      // Execute onchain transaction first
      const signature = await signAndSend(instruction, txSigner)
      console.debug('INIT DEBUG: Onchain transaction successful, signature=', signature)

      // Only insert into Supabase after onchain success
      const { error: dbError } = await supabase
        .from('reits')
        .insert({ id: uuid, reit_name: reitName })

      if (dbError) {
        // If Supabase fails, we have an inconsistency, but onchain is done
        // In a production system, we'd need compensation logic or retry
        console.error('INIT DEBUG: Failed to create REIT in database after onchain success:', dbError.message)
        throw new Error(`Onchain creation succeeded but database update failed: ${dbError.message}`)
      }

      console.debug('INIT DEBUG: Inserted into Supabase with id=', uuid)

      return signature
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
