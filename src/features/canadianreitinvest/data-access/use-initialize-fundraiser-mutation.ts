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
import { useSolana } from '@/components/solana/use-solana'

export function useInitializeFundraiserMutation({ account }: { account: UiWalletAccount }) {
  const txSigner = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { client } = useSolana()

  return useMutation({
    mutationFn: async ({ reitName, usdcMint }: { reitName: string; usdcMint: PublicKey }) => {
      console.group('🔍 INITIALIZE FUNDRAISER DEBUG')
      
      // Log cluster and RPC
      console.log('📡 Network Connection:')
      console.log('  - RPC URL:', client?.rpc)
      console.log('  - Signer:', txSigner?.address)
      
      // Log USDC mint details
      console.log('💰 USDC Mint Input:')
      console.log('  - Mint Address:', usdcMint.toBase58())
      
      // Check if USDC mint exists on chain
      console.log('🔎 Checking if USDC mint exists on chain...')
      try {
        const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        const mintAccountInfo = await (client?.rpc as any).getAccountInfo(usdcMint.toBase58() as Address).send()
        
        console.log('✅ USDC Mint Account Response:')
        console.log('  - Raw Response:', mintAccountInfo)
        
        if (!mintAccountInfo) {
          throw new Error('Account info is null/undefined')
        }
        
        const owner = (mintAccountInfo as any)?.owner
        const lamports = (mintAccountInfo as any)?.lamports
        const data = (mintAccountInfo as any)?.data
        
        console.log('  - Owner:', owner)
        console.log('  - Lamports:', lamports)
        console.log('  - Data Type:', typeof data, 'Length:', data?.length || 'N/A')
        
        // Check if owner is Token Program
        if (owner && owner !== TOKEN_PROGRAM_ID) {
          throw new Error(`Account owner is ${owner}, not Token Program ${TOKEN_PROGRAM_ID}`)
        }
        
        // Mint accounts should have 82 bytes of data
        if (data && data.length !== 82) {
          console.warn(`⚠️ WARNING: Mint data length is ${data.length}, expected 82 bytes`)
        }
        
        if (owner === TOKEN_PROGRAM_ID) {
          console.log('  ✅ Account is owned by Token Program')
          console.log('  ✅ This appears to be a valid Mint account')
        }
      } catch (error) {
        console.error('❌ USDC Mint Account Error:')
        console.error('  Error:', error)
        throw new Error(
          `USDC Mint validation failed: ${usdcMint.toBase58()}\n\n` +
          `The account either:\n` +
          `1. Does not exist\n` +
          `2. Is not owned by the Token Program\n` +
          `3. Is not a valid Mint account\n\n` +
          `Solution: Initialize the USDC mint by running:\n` +
          `cd anchor/scripts/usdc-setup && ./init-usdc-mint.sh\n\n` +
          `Error details: ${error instanceof Error ? error.message : String(error)}`
        )
      }

      // Generate UUID string and parse to bytes
      const uuid = uuidv4()
      const reitIdHash = uuidParse(uuid)

      console.log('📋 REIT Details:')
      console.log('  - Name:', reitName)
      console.log('  - UUID:', uuid)
      console.log('  - ID Hash (hex):', Buffer.from(reitIdHash).toString('hex'))

      // Insert into Supabase
      console.log('💾 Saving to Supabase...')
      const { error: dbError } = await supabase
        .from('reits')
        .insert({ id: uuid, reit_name: reitName })

      if (dbError) {
        throw new Error(`Failed to create REIT in database: ${dbError.message}`)
      }
      console.log('✅ Saved to Supabase')

      // Derive PDAs using the UUID bytes as seed
      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const seedBuffer = Buffer.from(reitIdHash)
      
      console.log('🔐 Program Accounts:')
      console.log('  - Program ID:', programId.toBase58())
      
      const [fundraiserPda] = await PublicKey.findProgramAddress([
        Buffer.from('fundraiser'),
        seedBuffer,
      ], programId)
      console.log('  - Fundraiser PDA:', fundraiserPda.toBase58())

      const [escrowVaultPda] = await PublicKey.findProgramAddress([
        Buffer.from('escrow_vault'),
        fundraiserPda.toBuffer(),
      ], programId)
      console.log('  - Escrow Vault PDA:', escrowVaultPda.toBase58())

      console.log('📝 Building Instruction...')
      const instruction = await getInitializeFundraiserInstructionAsync({
        fundraiser: fundraiserPda.toBase58() as Address,
        admin: txSigner,
        escrowVault: escrowVaultPda.toBase58() as Address,
        usdcMint: usdcMint.toBase58() as Address,
        reitId: uuid,
        reitIdHash: reitIdHash as unknown as Uint8Array,
      })

      console.log('✅ Instruction Built')
      console.log('📤 Accounts in Transaction:')
      console.log('  Detailed Account Info:')
      instruction.accounts?.forEach((account, index) => {
        const roleMap: Record<number, string> = { 0: 'Read-only', 1: 'Writable', 3: 'Signer' }
        const role = (account as any).role
        console.log(`    [${index}] ${(account as any).address}`)
        console.log(`         Role: ${roleMap[role] || role}`)
        if ((account as any).signer) console.log(`         Signer: Yes`)
      })

      console.log('🚀 Sending Transaction...')
      const result = await signAndSend(instruction, txSigner)
      
      console.log('✅ Transaction Sent:', result)
      console.groupEnd()
      
      return result
    },
    onSuccess: (signature) => {
      console.log('✅ SUCCESS: Transaction confirmed -', signature)
      toastTx(signature)
    },
    onError: (error) => {
      console.group('❌ ERROR: Initialize Fundraiser Failed')
      console.error('Error Message:', error instanceof Error ? error.message : error)
      console.error('Full Error:', error)
      if (error instanceof Error && error.stack) {
        console.error('Stack Trace:', error.stack)
      }
      console.groupEnd()
      toast.error('Failed to initialize fundraiser')
    },
  })
}
