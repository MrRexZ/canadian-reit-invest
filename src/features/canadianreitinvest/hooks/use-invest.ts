import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvestInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { UiWalletAccount } from '@wallet-ui/react'
import { Address } from 'gill'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useSolana } from '@/components/solana/use-solana'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { fetchMaybeInvestor } from '@/generated/accounts/investor'
import { supabase } from '@/lib/supabase'

export function useInvest({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client } = useSolana()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ amount, reitIdHash, reitId, userId }: { amount: number; reitIdHash: Uint8Array; reitId: string; userId: string }) => {
      if (!account?.publicKey) throw new Error('Wallet not connected')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const investorPublicKey = new PublicKey(account.publicKey)

      // Step 1: Derive fundraiser PDA from reit_id_hash
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

      // Step 2: Fetch fundraiser account
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
      console.debug('INVEST DEBUG: fundraiser.usdcMint=', fundraiser.usdcMint)
      console.debug('INVEST DEBUG: fundraiser.escrowVault=', fundraiser.escrowVault)

      // Step 3: Get investor's USDC ATA
      const usdcMint = new PublicKey(fundraiser.usdcMint)
      console.log('usdcMint:', usdcMint.toBase58())
      console.log('fundraiser.usdcMint:', fundraiser.usdcMint)
      const investorUsdcAta = getAssociatedTokenAddressSync(usdcMint, investorPublicKey)

      // Step 4: We no longer require the frontend to pre-create the USDC ATA.
      // The program will create the associated token account if it's missing (init_if_needed).
      // We'll still pass the derived ATA address to the instruction so the program can initialize it.
      // (No client-side existence check required.)

      // Step 5: Derive investor PDA (will be created by init_if_needed in the invest instruction)
      const [investorPda] = await PublicKey.findProgramAddress(
        [Buffer.from('investor'), investorPublicKey.toBuffer()],
        programId
      )
      console.debug('INVEST DEBUG: derived investorPda=', investorPda.toBase58())

      // Step 6: Fetch current investor account to get investment counter for PDA derivation
      const investorAccount = await fetchMaybeInvestor(
        client.rpc,
        investorPda.toBase58() as Address
      )
      console.debug('INVEST DEBUG: investorAccount.exists=', investorAccount?.exists)

      // Get current counter (0 if investor account doesn't exist yet)
      const currentCounter = investorAccount?.exists
        ? Number(investorAccount.data.investmentCounter)
        : 0
      console.debug('INVEST DEBUG: currentCounter=', currentCounter)

      // Step 7: Derive investment PDA using the current counter
      const investmentCounterBuf = Buffer.alloc(8)
      investmentCounterBuf.writeBigUInt64LE(BigInt(currentCounter))

      const [investmentPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('investment'),
          investorPublicKey.toBuffer(),
          fundraiserPda.toBuffer(),
          investmentCounterBuf,
        ],
        programId
      )
      console.debug('INVEST DEBUG: derived investmentPda=', investmentPda.toBase58())

      // Step 7: Get escrow vault from fundraiser
      const escrowVault = new PublicKey(fundraiser.escrowVault)

      // Step 8: Build and send invest instruction
      const instruction = await getInvestInstructionAsync({
        investorSigner: signer,
        investor: investorPda.toBase58() as Address,
        fundraiser: fundraiserPda.toBase58() as Address,
        investment: investmentPda.toBase58() as Address,
        investorUsdcAta: investorUsdcAta.toBase58() as Address,
        usdcMint: usdcMint.toBase58() as Address,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID.toBase58() as Address,
        escrowVault: escrowVault.toBase58() as Address,
        amount: BigInt(amount),
        reitIdHash: reitIdHash as unknown as Uint8Array,
      })

      const sig = await signAndSend(instruction, signer)
      toast.success('Investment submitted')

      // Wait for transaction to be confirmed before completing mutation
      console.log('[INVEST] Waiting for transaction confirmation...')
      let confirmationStatus = null
      let retries = 0
      const maxRetries = 30 // ~30 seconds with 1 second polling

      while (retries < maxRetries) {
        try {
          const signatureStatus = await client.rpc.getSignatureStatuses([sig as any]).send()
          const status = signatureStatus.value?.[0]

          if (status?.err) {
            console.error('[INVEST] Transaction failed with error:', status.err)
            throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
          }

          if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
            confirmationStatus = status.confirmationStatus
            console.log(`[INVEST] Transaction confirmed at "${confirmationStatus}" commitment level`)
            break
          }

          retries++
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
          }
        } catch (statusError) {
          console.warn('[INVEST] Error checking transaction status:', statusError)
          retries++
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      if (!confirmationStatus) {
        console.error('[INVEST] Transaction confirmation timeout - did not reach confirmed status within 30 seconds')
        throw new Error('Transaction confirmation timeout. The investment may not have been created.')
      }

      // Insert investment record into Supabase for atomicity
      try {
        const { error: dbError } = await supabase
          .from('investments')
          .insert({
            investment_pda: investmentPda.toBase58(),
            investor_user_id: userId,
            reit_id: reitId,
          })

        if (dbError) {
          console.error('Failed to insert investment into database:', dbError)
          // Note: Onchain transaction succeeded, but DB insert failed
          // This is a rare case that may require manual reconciliation
          toast.error('Investment created onchain but database update failed. Please contact support.')
        } else {
          console.log('Investment record inserted into database successfully')
          // Invalidate investments query to trigger UI update
          queryClient.invalidateQueries({ queryKey: ['investments'] })
        }
      } catch (dbErr) {
        console.error('Exception during database insertion:', dbErr)
        toast.error('Investment created onchain but database update failed. Please contact support.')
      }

      return sig
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch for all users
      queryClient.invalidateQueries({ queryKey: ['investments'] })
      queryClient.invalidateQueries({ queryKey: ['fundraiser'] })
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Investment failed')
    },
  })
}
