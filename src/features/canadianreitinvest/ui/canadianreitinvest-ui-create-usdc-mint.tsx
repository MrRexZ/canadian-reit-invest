import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useSolana } from '@/components/solana/use-solana'
import { toast } from 'sonner'
import { LOCALNET_USDC_MINT_ADDRESS } from '@/lib/usdc-mint-address'

export function CanadianreitinvestUiCreateUsdcMint() {
  const { cluster } = useSolana()

  // Only show on localhost
  if (cluster.label !== 'Localhost') {
    return null
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(LOCALNET_USDC_MINT_ADDRESS)
    toast.success('USDC Mint address copied to clipboard!')
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">USDC Mint (Localnet)</h3>
      <p className="text-sm text-muted-foreground">
        USDC mint address from your localnet keypair. Initialize it by running:
      </p>
      <div className="text-xs text-muted-foreground bg-muted p-2 rounded mb-3">
        <code>cd anchor/scripts/usdc-setup && ./init-usdc-mint.sh</code>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mintAddress">Mint Address:</Label>
        <div className="flex gap-2">
          <Input
            id="mintAddress"
            value={LOCALNET_USDC_MINT_ADDRESS}
            readOnly
            className="flex-1 font-mono"
          />
          <Button variant="outline" onClick={handleCopy}>
            Copy
          </Button>
        </div>
      </div>
    </div>
  )
}