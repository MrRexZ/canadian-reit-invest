import { useMutation } from '@tanstack/react-query'
import { UiWalletAccount } from '@wallet-ui/react'
import { useWalletUi } from '@wallet-ui/react'
import { PublicKey, Keypair, Connection, SystemProgram, Transaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, createInitializeMintInstruction, MINT_SIZE } from '@solana/spl-token'
import { toast } from 'sonner'
import { useSolana } from '@/components/solana/use-solana'
import { supabase } from '@/lib/supabase'

export function useCreateMint({ account }: { account: UiWalletAccount }) {
  const { wallet } = useWalletUi()
  const { client } = useSolana()

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

      // Create a new keypair for the REIT mint
      const reitMintKeypair = Keypair.generate()
      console.log('[CREATE MINT DEBUG] Generated REIT mint keypair:', reitMintKeypair.publicKey.toBase58())
      console.log('[CREATE MINT DEBUG] REIT mint keypair secret key (first 20 bytes):', Array.from(reitMintKeypair.secretKey.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '))
      console.log('[CREATE MINT DEBUG] REIT mint keypair full secret:', Buffer.from(reitMintKeypair.secretKey).toString('base64'))
      
      // Check if this specific mint account already exists on-chain (should be extremely rare with random generation)
      try {
        const existingMintAccount = await (client.rpc as any).getAccountInfo(reitMintKeypair.publicKey.toBase58()).send()
        if (existingMintAccount?.value?.data) {
          console.error('[CREATE MINT DEBUG] COLLISION: This randomly generated mint address already exists on-chain!:', reitMintKeypair.publicKey.toBase58())
          console.error('[CREATE MINT DEBUG] This is extremely unlikely. Account data:', existingMintAccount.value)
          throw new Error('Generated mint address collision - please try again')
        } else {
          console.log('[CREATE MINT DEBUG] Mint account does not exist yet, proceeding with creation')
        }
      } catch (err) {
        // Account doesn't exist, which is what we want
        console.log('[CREATE MINT DEBUG] Confirmed mint account does not exist (expected), will create')
      }

      console.log('[CREATE MINT DEBUG] Building create mint transaction...')
      
      const connection = new Connection('http://localhost:8899', 'confirmed')
      const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE)
      console.log('[CREATE MINT DEBUG] Lamports needed:', lamports)
      
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: adminPublicKey,
          newAccountPubkey: reitMintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          reitMintKeypair.publicKey,
          0, // decimals
          adminPublicKey, // mint authority
          null, // freeze authority
          TOKEN_PROGRAM_ID
        )
      )
      
      console.log('[CREATE MINT DEBUG] Transaction instructions:', transaction.instructions.length)
      
      // Set recent blockhash and fee payer
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = adminPublicKey
      
      console.log('[CREATE MINT DEBUG] Blockhash:', blockhash)
      
      // Check wallet balance first
      const balance = await connection.getBalance(adminPublicKey)
      console.log('[CREATE MINT DEBUG] Wallet balance:', balance, 'lamports')
      
      if (balance < lamports + 5000) { // Need rent + tx fee
        throw new Error(`Insufficient balance. Need at least ${(lamports + 5000) / 1e9} SOL, have ${balance / 1e9} SOL. Please airdrop some SOL to your wallet.`)
      }
      
      // IMPORTANT: Sign with mint keypair FIRST (it needs to sign offline)
      transaction.partialSign(reitMintKeypair)
      console.log('[CREATE MINT DEBUG] Mint keypair signed')
      
      // Get the connected wallet adapter from window
      // WalletUI uses standard wallet adapters which inject into window
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walletAdapter = (window as any)[wallet.name.toLowerCase()] || (window as any).solana
      
      if (!walletAdapter || !walletAdapter.signTransaction) {
        throw new Error(`${wallet.name} wallet not found or does not support signing`)
      }
      
      console.log('[CREATE MINT DEBUG] Requesting wallet signature...')
      // Now have the user sign with their wallet (this is the fee payer)
      const signed = await walletAdapter.signTransaction(transaction)
      console.log('[CREATE MINT DEBUG] Wallet signed successfully')
      
      // Send the already-signed transaction
      console.log('[CREATE MINT DEBUG] Sending transaction...')
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })
      
      console.log('[CREATE MINT DEBUG] Transaction sent:', signature)
      
      // Get latest blockhash for confirmation
      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
      
      // Confirm the transaction using blockhash strategy
      console.log('[CREATE MINT DEBUG] Confirming transaction...')
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed')
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }
      
      console.log('[CREATE MINT DEBUG] ✅ Transaction confirmed:', signature)
      
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