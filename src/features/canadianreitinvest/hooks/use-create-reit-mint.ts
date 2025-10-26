import { useMutation } from '@tanstack/react-query'
import { UiWalletAccount } from '@wallet-ui/react'
import { useWalletUi } from '@wallet-ui/react'
import { PublicKey, Keypair } from '@solana/web3.js'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { getCreateReitMintInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { parse as uuidParse } from 'uuid'
import { Address, createKeyPairSignerFromBytes } from 'gill'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'

export function useCreateReitMint({ account }: { account: UiWalletAccount }) {
  const { wallet } = useWalletUi()
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()

  return useMutation({
    mutationFn: async ({ reitId, name, symbol }: { reitId: string; name: string; symbol: string }) => {
      if (!account || !account.publicKey || !wallet) {
        toast.error('Wallet not connected')
        return
      }

      const adminPublicKey = new PublicKey(account.publicKey)

      console.log('[CREATE MINT DEBUG] Starting create mint process')
      console.log('[CREATE MINT DEBUG] REIT ID:', reitId)
      console.log('[CREATE MINT DEBUG] Name:', name)
      console.log('[CREATE MINT DEBUG] Symbol:', symbol)
      console.log('[CREATE MINT DEBUG] Admin public key:', adminPublicKey.toBase58())

      // Check if mint already exists in database
      const { data: reit } = await supabase
        .from('reits')
        .select('reit_mint_token_address')
        .eq('id', reitId)
        .single()

      if (reit?.reit_mint_token_address && reit.reit_mint_token_address !== '11111111111111111111111111111111') {
        console.log('[CREATE MINT DEBUG] REIT mint already exists in database:', reit.reit_mint_token_address)
        toast.success(`REIT mint already exists: ${reit.reit_mint_token_address}`)
        return reit.reit_mint_token_address
      }

      // Verify admin is the authorized admin wallet
      const adminWallet = import.meta.env.VITE_ADMIN_WALLET
      console.log('[CREATE MINT DEBUG] Expected admin wallet from env:', adminWallet)
      console.log('[CREATE MINT DEBUG] Current signer:', adminPublicKey.toBase58())

      if (!adminWallet || adminPublicKey.toBase58() !== adminWallet) {
        console.error('[CREATE MINT DEBUG] Unauthorized admin wallet')
        throw new Error('Only the authorized admin wallet can create mint')
      }

      // Compute reitIdHash from reitId (assuming reitId is UUID string)
      const reitIdHash = uuidParse(reitId) as Uint8Array
      console.log('[CREATE MINT DEBUG] REIT ID hash:', Buffer.from(reitIdHash).toString('hex'))

      // Generate a new keypair for the REIT mint
      const reitMintKeypair = Keypair.generate()
      console.log('[CREATE MINT DEBUG] Generated REIT mint keypair:', reitMintKeypair.publicKey.toBase58())

      // Convert Solana Keypair to gill signer
      const reitMintSigner = await createKeyPairSignerFromBytes(reitMintKeypair.secretKey)

      // Derive fundraiser PDA
      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const [fundraiserPda] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), Buffer.from(reitIdHash)],
        programId
      )
      console.log('[CREATE MINT DEBUG] Derived fundraiser PDA:', fundraiserPda.toBase58())

      // Build create mint instruction
      const instruction = await getCreateReitMintInstructionAsync({
        admin: signer,
        fundraiser: fundraiserPda.toBase58() as Address,
        reitMint: reitMintSigner, // Pass signer instead of public key
        reitIdHash: reitIdHash,
        name: name,
        symbol: symbol,
      })

      console.log('[CREATE MINT DEBUG] Built create mint instruction')

      // Send the transaction - reitMintKeypair will sign as part of the instruction
      const signature = await signAndSend(instruction, signer)
      console.log('[CREATE MINT DEBUG] Transaction sent:', signature)

      // Update Supabase with the mint address
      const { error: updateError } = await supabase
        .from('reits')
        .update({ reit_mint_token_address: reitMintKeypair.publicKey.toString() })
        .eq('id', reitId)

      if (updateError) {
        console.error('[CREATE MINT DEBUG] Failed to update Supabase:', updateError)
        toast.error('Mint created but failed to update database')
      } else {
        console.log('[CREATE MINT DEBUG] Supabase updated successfully')
      }

      toast.success(`REIT mint created successfully! TX: ${signature.slice(0, 8)}...${signature.slice(-8)}`)

      return signature
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Create mint failed')
    },
  })
}