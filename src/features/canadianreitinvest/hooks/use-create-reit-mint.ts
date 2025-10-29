import { useMutation } from '@tanstack/react-query'
import { UiWalletAccount } from '@wallet-ui/react'
import { PublicKey, Keypair, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js'
import { toast } from 'sonner'
import { getCreateReitMintInstructionAsync } from '@/generated'
import { useWalletUiSigner, useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { parse as uuidParse } from 'uuid'
import { Address, createKeyPairSignerFromBytes } from 'gill'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { uploadReitMetadataToSupabase, ReitMetadata } from '@/lib/supabase-file-upload'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { useSolana } from '@/components/solana/use-solana'

export function useCreateReitMint({ account, onSuccess }: { 
  account: UiWalletAccount;
  onSuccess?: () => void;
}) {
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client } = useSolana()

  return useMutation({
    mutationFn: async ({ reitId, name, symbol, description, sharePrice, currency }: {
      reitId: string;
      name: string;
      symbol: string;
      description: string;
      sharePrice: string;
      currency: string;
    }) => {
      if (!account || !account.publicKey) {
        toast.error('Wallet not connected')
        return
      }

      const adminPublicKey = new PublicKey(account.publicKey)

      console.log('[CREATE MINT DEBUG] Starting create mint process')
      console.log('[CREATE MINT DEBUG] REIT ID:', reitId)
      console.log('[CREATE MINT DEBUG] Name:', name)
      console.log('[CREATE MINT DEBUG] Symbol:', symbol)
      console.log('[CREATE MINT DEBUG] Description:', description)
      console.log('[CREATE MINT DEBUG] Share Price:', sharePrice)
      console.log('[CREATE MINT DEBUG] Currency:', currency)
      console.log('[CREATE MINT DEBUG] Admin public key:', adminPublicKey.toBase58())

      // Create metadata JSON
      const metadata: ReitMetadata = {
        name,
        symbol,
        description,
        attributes: [
          {
            trait_type: 'share_price',
            value: sharePrice,
          },
          {
            trait_type: 'currency',
            value: currency,
          },
        ],
      }

      console.log('[CREATE MINT DEBUG] Created metadata:', metadata)

      // Upload metadata to Supabase Storage
      console.log('[CREATE MINT DEBUG] Uploading metadata to Supabase Storage...')
      const metadataUri = await uploadReitMetadataToSupabase(metadata, reitId)
      console.log('[CREATE MINT DEBUG] Metadata uploaded to:', metadataUri)

      // Compute reitIdHash from reitId (assuming reitId is UUID string)
      const reitIdHash = uuidParse(reitId) as Uint8Array
      console.log('[CREATE MINT DEBUG] REIT ID hash:', Buffer.from(reitIdHash).toString('hex'))

      // Derive fundraiser PDA to check if mint exists there
      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const [fundraiserPda] = await PublicKey.findProgramAddress(
        [Buffer.from('fundraiser'), Buffer.from(reitIdHash)],
        programId
      )

      // Check if fundraiser account exists and has a mint set
      let fundraiserAccount = null
      try {
        const maybeFundraiserAccount = await fetchMaybeFundraiser(client.rpc, fundraiserPda.toBase58() as Address)
        fundraiserAccount = maybeFundraiserAccount.exists ? maybeFundraiserAccount : null
      } catch (_) {
        // Fundraiser account might not exist yet
        console.log('[CREATE MINT DEBUG] Fundraiser account not found on-chain')
      }

      const mintExistsInPda = fundraiserAccount?.data?.reitMint && 
                             fundraiserAccount.data.reitMint !== '11111111111111111111111111111111'

      if (mintExistsInPda) {
        console.log('[CREATE MINT DEBUG] REIT mint already exists in PDA:', fundraiserAccount!.data.reitMint)
        console.log('[CREATE MINT DEBUG] This mint already exists. Use update mint instead.')
        toast.info('REIT mint already exists. Use the Update Mint option to modify it.')
        return fundraiserAccount!.data.reitMint
      }

      // Verify admin is the authorized admin wallet
      const adminWallet = import.meta.env.VITE_ADMIN_WALLET
      console.log('[CREATE MINT DEBUG] Expected admin wallet from env:', adminWallet)
      console.log('[CREATE MINT DEBUG] Current signer:', adminPublicKey.toBase58())

      if (!adminWallet || adminPublicKey.toBase58() !== adminWallet) {
        console.error('[CREATE MINT DEBUG] Unauthorized admin wallet')
        throw new Error('Only the authorized admin wallet can create mint')
      }

      // Generate a new keypair for the REIT mint
      const reitMintKeypair = Keypair.generate()
      console.log('[CREATE MINT DEBUG] Generated REIT mint keypair:', reitMintKeypair.publicKey.toBase58())

      // Convert Solana Keypair to gill signer
      const reitMintSigner = await createKeyPairSignerFromBytes(reitMintKeypair.secretKey)

      // Derive metadata account address
      const [metadataPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(), // Metaplex Token Metadata program ID
          reitMintKeypair.publicKey.toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      )
      console.log('[CREATE MINT DEBUG] Derived metadata PDA:', metadataPda.toBase58())

      // Build create mint instruction
      const instruction = await getCreateReitMintInstructionAsync({
        admin: signer,
        fundraiser: fundraiserPda.toBase58() as Address,
        reitMint: reitMintSigner,
        metadata: metadataPda.toBase58() as Address,
        tokenMetadataProgram: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address,
  instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY.toBase58() as Address,
        reitIdHash: reitIdHash,
        name: name,
        symbol: symbol,
        metadataUri: metadataUri,
      })

      console.log('[CREATE MINT DEBUG] Built create mint instruction')

      // Send the transaction
      const signature = await signAndSend(instruction, signer)
      console.log('[CREATE MINT DEBUG] Transaction sent:', signature)

      // Note: Mint address is now stored in the Fundraiser PDA (reitMint field), not in Supabase
      console.log('[CREATE MINT DEBUG] REIT mint created on-chain. Address stored in Fundraiser PDA:', reitMintKeypair.publicKey.toString())

      toast.success(`REIT mint created successfully! TX: ${signature.slice(0, 8)}...${signature.slice(-8)}`)

      return signature
    },
    onSuccess: () => {
      // Call the optional onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    },
    onError: (err) => {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Create mint failed')
    },
  })
}