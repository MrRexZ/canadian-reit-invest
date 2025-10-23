import { useState } from 'react'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { createMintToInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UiWalletAccount, useWalletUi } from '@wallet-ui/react'
import { useSolana } from '@/components/solana/use-solana'
import { CLUSTER_CONFIG } from '@/lib/cluster-config'

interface LocalnetMintTokensProps {
  account: UiWalletAccount
}

export function LocalnetMintTokens({ account }: LocalnetMintTokensProps) {
  const { cluster } = useSolana()
  const { wallet } = useWalletUi()
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  // Only show on localnet
  if (cluster.label !== 'Localnet') {
    return null
  }

  const handleMintTokens = async () => {
    if (!account || !account.publicKey || !wallet) {
      toast.error('Wallet not connected')
      return
    }

    if (!recipientAddress || !amount) {
      toast.error('Please enter both recipient address and amount')
      return
    }

    const usdcMintAddress = CLUSTER_CONFIG.localnet.usdcMint
    if (!usdcMintAddress) {
      toast.error('USDC Mint not configured for localnet. Run: bash scripts/create-usdc-mint.sh')
      return
    }

    setLoading(true)
    try {
      const connection = new Connection('http://localhost:8899', 'confirmed')
      const faucetPubkey = new PublicKey(account.publicKey)
      const recipientPubkey = new PublicKey(recipientAddress)
      const mintPubkey = new PublicKey(usdcMintAddress)

      // Get the associated token account for the recipient
      const ata = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey)

      console.log('Minting tokens...')
      console.log('  Mint:', mintPubkey.toBase58())
      console.log('  Recipient ATA:', ata.toBase58())
      console.log('  Amount:', amount, '(USDC)')

      // Create mint instruction
      const mintInstruction = createMintToInstruction(
        mintPubkey,
        ata,
        faucetPubkey, // mint authority
        BigInt(amount) * BigInt(1_000_000) // USDC has 6 decimals
      )

      const transaction = new Transaction().add(mintInstruction)

      // Get the connected wallet adapter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walletAdapter = (window as any)[wallet.name.toLowerCase()] || (window as any).solana

      if (!walletAdapter || !walletAdapter.signTransaction) {
        throw new Error(`${wallet.name} wallet not found or does not support signing`)
      }

      // Set recent blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = faucetPubkey

      // Sign with wallet
      const signed = await walletAdapter.signTransaction(transaction)

      // Send
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })

      console.log('Transaction sent:', signature)

      // Confirm
      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed')

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }

      toast.success(`Minted ${amount} USDC to ${recipientAddress}`)
      setRecipientAddress('')
      setAmount('')
    } catch (error: unknown) {
      console.error('Minting error:', error)
      toast.error(`Failed to mint tokens: ${(error as Error)?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">Mint USDC Tokens</h3>
      <p className="text-sm text-muted-foreground">
        Mint USDC tokens to a specified wallet address for testing.
      </p>

      <div>
        <Label htmlFor="recipientAddress">Recipient Address</Label>
        <Input
          id="recipientAddress"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          placeholder="Enter Solana wallet address"
          className="font-mono text-xs"
        />
      </div>

      <div>
        <Label htmlFor="amount">Amount (USDC)</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 1000"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Will be minted with 6 decimals (1 = 0.000001 USDC)
        </p>
      </div>

      <Button onClick={handleMintTokens} disabled={loading || !recipientAddress || !amount}>
        {loading ? 'Minting...' : 'Mint Tokens'}
      </Button>
    </div>
  )
}
