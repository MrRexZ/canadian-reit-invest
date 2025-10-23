import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { useInitializeFundraiserMutation } from '../data-access/use-initialize-fundraiser-mutation'
import { PublicKey } from '@solana/web3.js'
import { useSolana } from '@/components/solana/use-solana'
import { CLUSTER_CONFIG } from '@/lib/cluster-config'
import { toast } from 'sonner'

export function CanadianreitinvestUiInitializeFundraiser({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const [reitName, setReitName] = useState('')
  const [usdcMint, setUsdcMint] = useState('')

  const initializeMutation = useInitializeFundraiserMutation({ account })

  // Use hardcoded USDC mint for devnet and localnet
  const isDevnet = cluster.label === 'Devnet'
  const isLocalnet = cluster.label === 'Localnet'
  const defaultUsdcMint = isDevnet ? CLUSTER_CONFIG.devnet.usdcMint : isLocalnet ? CLUSTER_CONFIG.localnet.usdcMint : ''

  const handleInitialize = async () => {
    const mintToUse = (isDevnet || isLocalnet) ? defaultUsdcMint : usdcMint
    if (!reitName || !mintToUse) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      const usdcMintPubkey = new PublicKey(mintToUse)
      console.debug('[InitializeFundraiser] Starting mutation with REIT name:', reitName, 'USDC Mint:', mintToUse)
      await initializeMutation.mutateAsync({ reitName, usdcMint: usdcMintPubkey })
    } catch (error) {
      console.error('Invalid USDC mint address or mutation error:', error)
      toast.error(`Error: ${(error as Error).message}`)
    }
  }

  if ((isDevnet || isLocalnet) && !defaultUsdcMint) {
    return (
      <div className="space-y-4 p-4 border border-red-300 rounded-lg bg-red-50">
        <h3 className="text-lg font-semibold text-red-900">Initialize Fundraiser</h3>
        <p className="text-red-700">
          ⚠️ USDC Mint not configured for {cluster.label}. 
          Please run: <code className="bg-red-100 px-2 py-1 rounded">bash scripts/create-usdc-mint.sh</code>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Initialize Fundraiser</h3>
      <div>
        <Label htmlFor="reitName">REIT Name</Label>
        <Input
          id="reitName"
          value={reitName}
          onChange={(e) => setReitName(e.target.value)}
          placeholder="e.g. Maple REIT"
        />
      </div>
      {!(isDevnet || isLocalnet) && (
        <div>
          <Label htmlFor="usdcMint">USDC Mint Address</Label>
          <Input
            id="usdcMint"
            value={usdcMint}
            onChange={(e) => setUsdcMint(e.target.value)}
            placeholder="Paste USDC mint address"
          />
        </div>
      )}
      {(isDevnet || isLocalnet) && (
        <div>
          <Label>USDC Mint Address ({cluster.label})</Label>
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded font-mono break-all">
            {defaultUsdcMint}
          </div>
        </div>
      )}
      <Button
        onClick={handleInitialize}
        disabled={initializeMutation.isPending || !reitName || (!(isDevnet || isLocalnet) && !usdcMint) || ((isDevnet || isLocalnet) && !defaultUsdcMint)}
      >
        {initializeMutation.isPending ? 'Initializing...' : 'Initialize Fundraiser'}
      </Button>
    </div>
  )
}
