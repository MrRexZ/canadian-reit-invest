import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCheckUsdcMint, LOCALNET_USDC_MINT_ADDRESS } from '../hooks/use-initialize-usdc-mint'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export function CanadianreitinvestUiUsdcLocalnetManagement() {
  const { data: mintStatus, isLoading } = useCheckUsdcMint()

  const handleCopy = () => {
    navigator.clipboard.writeText(LOCALNET_USDC_MINT_ADDRESS)
  }

  const handleOpenSetupGuide = () => {
    // Open the README in a new tab or show instructions
    alert(`
To initialize the USDC mint, run:

  cd anchor/scripts/usdc-setup
  chmod +x init-usdc-mint.sh
  ./init-usdc-mint.sh

Or manually with spl-token CLI:

  spl-token create-token anchor/usdc-mint-keypair.json --decimals 6

See anchor/scripts/usdc-setup/README.md for more details.
    `)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-card">
        <div>
          <h3 className="text-lg font-semibold mb-2">USDC Localnet Management</h3>
          <p className="text-sm text-muted-foreground">Checking USDC mint status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div>
        <h3 className="text-lg font-semibold mb-2">USDC Localnet Management</h3>
        <p className="text-sm text-muted-foreground">
          Setup and monitor USDC mint on localnet for testing.
        </p>
      </div>

      {mintStatus?.exists ? (
        <div className="space-y-3">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">✓ USDC mint initialized!</AlertTitle>
            <AlertDescription className="text-green-800">
              The mint is ready to use for fundraiser initialization and testing.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="mintAddress">USDC Mint Address:</Label>
            <div className="flex gap-2">
              <Input
                id="mintAddress"
                value={LOCALNET_USDC_MINT_ADDRESS}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button variant="outline" onClick={handleCopy} size="sm">
                Copy
              </Button>
            </div>
          </div>

          {mintStatus.mint && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <h4 className="font-semibold text-sm">Mint Details</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  • <strong>Decimals:</strong> {mintStatus.mint.decimals}
                </p>
                <p>
                  • <strong>Supply:</strong> {mintStatus.mint.supply}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">USDC mint not initialized</AlertTitle>
            <AlertDescription className="text-orange-800">
              Run the setup script to initialize the USDC mint for localnet.
            </AlertDescription>
          </Alert>
          <Button onClick={handleOpenSetupGuide} className="w-full">
            Show Setup Instructions
          </Button>
          <div className="space-y-2">
            <Label htmlFor="mintAddress">Mint Address (reference):</Label>
            <div className="flex gap-2">
              <Input
                id="mintAddress"
                value={LOCALNET_USDC_MINT_ADDRESS}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button variant="outline" onClick={handleCopy} size="sm">
                Copy
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t space-y-2">
        <h4 className="font-semibold text-sm">Quick Start</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>1. Start validator: <code className="bg-muted px-2 py-1 rounded">pnpm anchor-localnet</code></p>
          <p>2. Run setup: <code className="bg-muted px-2 py-1 rounded">cd anchor/scripts/usdc-setup && ./init-usdc-mint.sh</code></p>
          <p>3. Use in fundraiser initialization with the mint address above</p>
        </div>
      </div>
    </div>
  )
}
