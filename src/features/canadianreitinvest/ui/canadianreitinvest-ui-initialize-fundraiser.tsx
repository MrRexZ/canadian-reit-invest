import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { useInitializeFundraiserMutation } from '../data-access/use-initialize-fundraiser-mutation'
import { PublicKey } from '@solana/web3.js'
import { useSolana } from '@/components/solana/use-solana'
import { CLUSTER_CONFIG } from '@/lib/cluster-config'
import { LOCALNET_USDC_MINT_ADDRESS } from '@/lib/usdc-mint-address'

export function CanadianreitinvestUiInitializeFundraiser({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const [reitName, setReitName] = useState('')
  const [usdcMint, setUsdcMint] = useState('')

  const initializeMutation = useInitializeFundraiserMutation({ account })

  // Use hardcoded USDC mint for devnet and localnet
  const isDevnet = cluster.label === 'Devnet'
  const isLocalhost = cluster.label === 'Localhost'
  
  const defaultUsdcMint = isDevnet 
    ? CLUSTER_CONFIG.devnet.usdcMint 
    : isLocalhost 
    ? LOCALNET_USDC_MINT_ADDRESS 
    : ''

  const handleInitialize = () => {
    const mintToUse = (isDevnet || isLocalhost) ? defaultUsdcMint : usdcMint
    
    console.group('📋 Initialize Fundraiser - User Input')
    console.log('Cluster:', cluster.label)
    console.log('REIT Name:', reitName)
    console.log('USDC Mint (selected):', mintToUse)
    console.log('Is Devnet:', isDevnet)
    console.log('Is Localhost:', isLocalhost)
    console.groupEnd()
    
    if (!reitName || !mintToUse) {
      console.warn('⚠️ Missing required fields - skipping')
      return
    }
    try {
      const usdcMintPubkey = new PublicKey(mintToUse)
      console.log('✅ Valid USDC Mint PublicKey created:', usdcMintPubkey.toBase58())
      initializeMutation.mutateAsync({ reitName, usdcMint: usdcMintPubkey })
    } catch (error) {
      console.error('❌ Invalid USDC mint address', error)
    }
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
      {!isDevnet && !isLocalhost && (
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
      {(isDevnet || isLocalhost) && (
        <div>
          <Label>USDC Mint Address ({isDevnet ? 'Devnet' : 'Localnet'})</Label>
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded font-mono break-all">
            {defaultUsdcMint}
          </div>
          {isLocalhost && (
            <p className="text-xs text-yellow-600 mt-2">
              Make sure the USDC mint has been initialized by running:
              <code className="bg-yellow-50 px-2 py-1 rounded block mt-1">
                cd anchor/scripts/usdc-setup && ./init-usdc-mint.sh
              </code>
            </p>
          )}
        </div>
      )}
      <Button
        onClick={handleInitialize}
        disabled={initializeMutation.isPending || !reitName || (!isDevnet && !usdcMint)}
      >
        Initialize Fundraiser{initializeMutation.isPending && '...'}
      </Button>
    </div>
  )
}
