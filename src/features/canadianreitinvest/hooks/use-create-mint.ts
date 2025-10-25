import { useMutation } from '@tanstack/react-query'
import { getCreateMintInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { UiWalletAccount } from '@wallet-ui/react'
import { PublicKey, Keypair } from '@solana/web3.js'
import { toast } from 'sonner'
import { useSolana } from '@/components/solana/use-solana'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { Address } from 'gill'
import { supabase } from '@/lib/supabase'
import { parse as uuidParse } from 'uuid'

export function useCreateMint({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client } = useSolana()

  return useMutation({
    mutationFn: async ({ reitId, sharePrice, currency }: { reitId: string; sharePrice: number; currency: string }) => {
      if (!account?.publicKey) throw new Error('Wallet not connected')

      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const adminPublicKey = new PublicKey(account.publicKey)

      console.log('[CREATE MINT DEBUG] Starting create mint process')
      console.log('[CREATE MINT DEBUG] REIT ID:', reitId)
      console.log('[CREATE MINT DEBUG] Share Price:', sharePrice)
      console.log('[CREATE MINT DEBUG] Currency:', currency)
      console.log('[CREATE MINT DEBUG] Admin public key:', adminPublicKey.toBase58())

      // Parse reitId back to bytes for reitIdHash
      const reitIdHash = new Uint8Array(uuidParse(reitId) as Uint8Array)
      console.log('[CREATE MINT DEBUG] REIT ID hash (bytes):', reitIdHash)

      // Derive fundraiser PDA from reitIdHash
      const [fundraiserPda] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), Buffer.from(reitIdHash)],
        programId
      )
      console.log('[CREATE MINT DEBUG] Derived fundraiser PDA:', fundraiserPda.toBase58())

      // Fetch fundraiser account to verify admin
      const fundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      if (!fundraiserAccount?.exists) {
        console.error('[CREATE MINT DEBUG] Fundraiser account does not exist at:', fundraiserPda.toBase58())
        throw new Error('Fundraiser not found')
      }

      const fundraiser = fundraiserAccount.data
      console.log('[CREATE MINT DEBUG] Fundraiser admin:', fundraiser.admin)

      // Verify admin is the authorized admin wallet
      const adminWallet = import.meta.env.VITE_ADMIN_WALLET
      console.log('[CREATE MINT DEBUG] Expected admin wallet from env:', adminWallet)
      console.log('[CREATE MINT DEBUG] Current signer:', adminPublicKey.toBase58())

      if (!adminWallet || adminPublicKey.toBase58() !== adminWallet) {
        console.error('[CREATE MINT DEBUG] Unauthorized admin wallet')
        throw new Error('Only the authorized admin wallet can create mint')
      }
      if (fundraiser.admin !== adminPublicKey.toBase58()) {
        console.error('[CREATE MINT DEBUG] Signer is not the fundraiser admin')
        throw new Error('Signer is not the fundraiser admin')
      }

      // Create a new keypair for the REIT mint
      const reitMintKeypair = Keypair.generate()
      console.log('[CREATE MINT DEBUG] Generated REIT mint keypair:', reitMintKeypair.publicKey.toBase58())

      // Build create mint instruction
      console.log('[CREATE MINT DEBUG] Building create mint instruction...')
      const instruction = await getCreateMintInstructionAsync({
        admin: signer,
        fundraiser: fundraiserPda.toBase58() as Address,
        reitMint: reitMintKeypair as any,
        reitIdHash: reitIdHash,
        sharePrice: BigInt(sharePrice * 1_000_000), // Convert to USDC smallest units
        currency,
      })
      console.log('[CREATE MINT DEBUG] Create mint instruction built successfully')

      console.log('[CREATE MINT DEBUG] Sending transaction...')
      const sig = await signAndSend(instruction, signer)
      console.log('[CREATE MINT DEBUG] Transaction sent successfully!')
      console.log('[CREATE MINT DEBUG] Transaction signature:', sig)
      console.log('[CREATE MINT DEBUG] Transaction URL:', `https://explorer.solana.com/tx/${sig}?cluster=localnet`)

      // Verify the transaction was successful
      console.log('[CREATE MINT DEBUG] Verifying transaction results...')
      const updatedFundraiserAccount = await fetchMaybeFundraiser(
        client.rpc,
        fundraiserPda.toBase58() as Address
      )
      if (updatedFundraiserAccount?.exists) {
        const updatedFundraiser = updatedFundraiserAccount.data
        console.log('[CREATE MINT DEBUG] Fundraiser reit_mint after create:', updatedFundraiser.reitMint)
      }

      console.log('[CREATE MINT DEBUG] Transaction verification complete')

      // Update Supabase with the mint address
      const { error: updateError } = await supabase
        .from('reits')
        .update({ reit_mint_token_address: reitMintKeypair.publicKey.toBase58() })
        .eq('id', reitId)

      if (updateError) {
        console.error('[CREATE MINT DEBUG] Failed to update Supabase:', updateError)
        toast.error('Mint created but failed to update database')
      } else {
        console.log('[CREATE MINT DEBUG] Supabase updated successfully')
      }

      toast.success(`REIT mint created successfully! TX: ${sig.slice(0, 8)}...${sig.slice(-8)}`)

      return sig
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Create mint failed')
    },
  })
}