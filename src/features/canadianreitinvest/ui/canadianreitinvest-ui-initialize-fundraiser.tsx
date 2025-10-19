import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { useInitializeFundraiserMutation } from '../data-access/use-initialize-fundraiser-mutation'
import { PublicKey } from '@solana/web3.js'

export function CanadianreitinvestUiInitializeFundraiser({ account }: { account: UiWalletAccount }) {
  const [reitId, setReitId] = useState('')
  const [usdcMint, setUsdcMint] = useState('')

  const initializeMutation = useInitializeFundraiserMutation({ account })

  const handleInitialize = () => {
    if (!reitId || !usdcMint) return
    try {
      const usdcMintPubkey = new PublicKey(usdcMint)
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
      <div>
        <Label htmlFor="usdcMint">USDC Mint Address</Label>
        <Input
          id="usdcMint"
          value={usdcMint}
          onChange={(e) => setUsdcMint(e.target.value)}
          placeholder="USDC mint public key"
        />
      </div>
      <Button
        onClick={handleInitialize}
        disabled={initializeMutation.isPending || !reitId || !usdcMint}
      >
        Initialize Fundraiser{initializeMutation.isPending && '...'}
      </Button>
    </div>
  )
}
