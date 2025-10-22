import { useState } from 'react'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, createInitializeMintInstruction, MINT_SIZE } from '@solana/spl-token'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UiWalletAccount, useWalletUi } from '@wallet-ui/react'
import { useSolana } from '@/components/solana/use-solana'

interface CanadianreitinvestUiCreateUsdcMintProps {
  account: UiWalletAccount
}

export function CanadianreitinvestUiCreateUsdcMint({ account }: CanadianreitinvestUiCreateUsdcMintProps) {
  const { wallet } = useWalletUi()
  const { cluster } = useSolana()
  const [mintAddress, setMintAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Only show on localnet
  if (cluster.label !== 'Localnet') {
    return null
  }

  const handleCreateMint = async () => {
    if (!account || !account.publicKey || !wallet) {
      toast.error('Wallet not connected')
      return
    }

    setLoading(true)
    try {
      console.log('Starting mint creation...')
      const connection = new Connection('http://localhost:8899', 'confirmed')
      const userPubkey = new PublicKey(account.publicKey)
      const mintKeypair = Keypair.generate()
      
      console.log('Mint keypair:', mintKeypair.publicKey.toString())
      console.log('User pubkey:', userPubkey.toString())
      
      // Get rent for mint account
      const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE)
      console.log('Lamports needed:', lamports)
      
      // Build transaction
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: userPubkey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          6, // decimals
          userPubkey, // mint authority
          null, // freeze authority
          TOKEN_PROGRAM_ID
        )
      )
      
      console.log('Transaction instructions:', transaction.instructions.length)
      
      // Set recent blockhash and fee payer
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = userPubkey
      
      console.log('Blockhash:', blockhash)
      
      // Check wallet balance first
      const balance = await connection.getBalance(userPubkey)
      console.log('Wallet balance:', balance, 'lamports')
      
      if (balance < lamports + 5000) { // Need rent + tx fee
        throw new Error(`Insufficient balance. Need at least ${(lamports + 5000) / 1e9} SOL, have ${balance / 1e9} SOL. Please airdrop some SOL to your wallet.`)
      }
      
      // IMPORTANT: Sign with mint keypair FIRST (it needs to sign offline)
      transaction.partialSign(mintKeypair)
      console.log('Mint keypair signed')
      
      // Get the connected wallet adapter from window
      // WalletUI uses standard wallet adapters which inject into window
      const walletAdapter = (window as any)[wallet.name.toLowerCase()] || (window as any).solana
      
      if (!walletAdapter || !walletAdapter.signTransaction) {
        throw new Error(`${wallet.name} wallet not found or does not support signing`)
      }
      
      console.log('Requesting wallet signature...')
      // Now have the user sign with their wallet (this is the fee payer)
      const signed = await walletAdapter.signTransaction(transaction)
      console.log('Wallet signed successfully')
      
      // Send the already-signed transaction
      console.log('Sending transaction...')
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })
      
      console.log('Transaction sent:', signature)
      
      // Get latest blockhash for confirmation
      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
      
      // Confirm the transaction using blockhash strategy
      console.log('Confirming transaction...')
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed')
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }
      
      console.log('✅ Transaction confirmed:', signature)
      
      setMintAddress(mintKeypair.publicKey.toString())
      toast.success('USDC Mint created successfully!')
      console.log('Mint created successfully:', mintKeypair.publicKey.toString())
    } catch (error: any) {
      console.error('Mint creation error:', error)
      console.error('Error stack:', error.stack)
      toast.error(`Failed to create mint: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (mintAddress) {
      navigator.clipboard.writeText(mintAddress)
      toast.success('Mint address copied to clipboard!')
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">Create USDC Mint (Localnet)</h3>
      <p className="text-sm text-muted-foreground">
        Create a mock USDC mint for testing. Use the address below in the fundraiser form.
      </p>
      <Button onClick={handleCreateMint} disabled={loading}>
        {loading ? 'Creating...' : 'Create USDC Mint'}
      </Button>
      {mintAddress && (
        <div className="space-y-2">
          <Label htmlFor="mintAddress">Mint Address:</Label>
          <div className="flex gap-2">
            <Input
              id="mintAddress"
              value={mintAddress}
              readOnly
              className="flex-1"
            />
            <Button variant="outline" onClick={handleCopy}>
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}