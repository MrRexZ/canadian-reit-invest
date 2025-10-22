import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { useInitializeFundraiserMutation } from '../data-access/use-initialize-fundraiser-mutation'
import { PublicKey } from '@solana/web3.js'
import { useSolana } from '@/components/solana/use-solana'
import { CLUSTER_CONFIG } from '@/lib/cluster-config'

export function CanadianreitinvestUiInitializeFundraiser({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const [reitId, setReitId] = useState('')
  const [usdcMint, setUsdcMint] = useState('')

  const initializeMutation = useInitializeFundraiserMutation({ account })

  // On devnet, use hardcoded USDC mint
  const isDevnet = cluster.label === 'Devnet'
  const defaultUsdcMint = isDevnet ? CLUSTER_CONFIG.devnet.usdcMint : ''

  const handleInitialize = () => {
    const mintToUse = isDevnet ? defaultUsdcMint : usdcMint
    if (!reitId || !mintToUse) return
    try {
      const usdcMintPubkey = new PublicKey(mintToUse)
      initializeMutation.mutateAsync({ reitId, usdcMint: usdcMintPubkey })
    } catch (error) {
      console.error('Invalid USDC mint address', error)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Initialize Fundraiser</h3>
      <div>
        <Label htmlFor="reitId">REIT ID</Label>
        <Input
          id="reitId"
          value={reitId}
          onChange={(e) => setReitId(e.target.value)}
          placeholder="e.g. REIT-001"
        />
      </div>
      {!isDevnet && (
        <div>
          <Label htmlFor="usdcMint">USDC Mint Address</Label>
          <Input
            id="usdcMint"
            value={usdcMint}
            onChange={(e) => setUsdcMint(e.target.value)}
            placeholder="Paste USDC mint address from above"
          />
        </div>
      )}
      {isDevnet && (
        <div>
          <Label>USDC Mint Address (Devnet)</Label>
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            Using hardcoded devnet USDC mint: {defaultUsdcMint}
          </div>
        </div>
      )}
      <Button
        onClick={handleInitialize}
        disabled={initializeMutation.isPending || !reitId || (!isDevnet && !usdcMint)}
      >
        Initialize Fundraiser{initializeMutation.isPending && '...'}
      </Button>
    </div>
  )
}
