import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { useSolana } from '@/components/solana/use-solana'
import { useIssueDividend } from '../hooks/use-issue-dividend'
import { fetchMaybeInvestment } from '@/generated/accounts/investment'
import { InvestmentStatus } from '@/generated/types'
import { Address } from 'gill'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Investment {
  pda: string
  investor: string
  investorEmail?: string
  usdcAmount: number
  reitAmount: number
  status: InvestmentStatus
}

interface AdminDividendPageProps {
  account: UiWalletAccount
}

export function AdminDividendPage({ account }: AdminDividendPageProps) {
  const { client } = useSolana()
  
  const [selectedInvestmentPda, setSelectedInvestmentPda] = useState<string>('')
  const [dividendAmount, setDividendAmount] = useState<string>('')
  const [lastTxSig, setLastTxSig] = useState<string>('')

  const { mutate: issueDividend, isPending: isIssuing } = useIssueDividend({
    account,
  })

  // Fetch all investments with ShareIssued status
  const { data: investments = [], isLoading: isLoadingInvestments } = useQuery({
    queryKey: ['admin-investments', 'share-issued'],
    queryFn: async () => {
      // First, fetch all investments from Supabase
      const { data, error } = await supabase
        .from('investments')
        .select('investment_pda, investor_user_id')

      if (error) {
        console.error('Failed to fetch investments from Supabase:', error)
        toast.error('Failed to load investments')
        return []
      }

      const investmentsWithData: Investment[] = []

      // For each investment, fetch the on-chain PDA to check status
      for (const inv of data || []) {
        try {
          const investmentData = await fetchMaybeInvestment(
            client.rpc,
            inv.investment_pda as Address
          )

          if (!investmentData?.exists) {
            console.warn(`Investment PDA does not exist: ${inv.investment_pda}`)
            continue
          }

          const investment = investmentData.data
          
          // Only include investments with ShareIssued status
          if (investment.status !== InvestmentStatus.ShareIssued) {
            console.log(`Investment ${inv.investment_pda} has status ${investment.status}, skipping`)
            continue
          }

          investmentsWithData.push({
            pda: inv.investment_pda,
            investor: investment.investor,
            usdcAmount: Number(investment.usdcAmount || 0),
            reitAmount: Number(investment.reitAmount || 0),
            status: investment.status,
          })
        } catch (error) {
          console.error(`Failed to fetch investment ${inv.investment_pda}:`, error)
        }
      }

      if (investmentsWithData.length === 0) {
        console.warn('No investments with ShareIssued status found')
      }

      return investmentsWithData
    },
    enabled: !!client && !!account,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const selectedInvestment = useMemo(() => {
    return investments.find((inv) => inv.pda === selectedInvestmentPda)
  }, [investments, selectedInvestmentPda])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInvestmentPda) {
      toast.error('Please select an investment')
      return
    }

    if (!dividendAmount || isNaN(Number(dividendAmount)) || Number(dividendAmount) <= 0) {
      toast.error('Please enter a valid dividend amount')
      return
    }

    if (!account?.publicKey) {
      toast.error('Wallet not connected')
      return
    }

    issueDividend(
      {
        investmentPda: selectedInvestmentPda,
        amountUSDC: Number(dividendAmount),
      },
      {
        onSuccess: (result) => {
          setLastTxSig(result.sig)
          setDividendAmount('')
          setSelectedInvestmentPda('')
          toast.success(`Dividend issued: ${result.amount} USDC to ${result.investor}`)
        },
        onError: (error) => {
          console.error('Dividend issuance failed:', error)
          toast.error(error instanceof Error ? error.message : 'Failed to issue dividend')
        },
      }
    )
  }

  if (!account?.publicKey) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Issue Dividends</CardTitle>
          <CardDescription>Connect your wallet to issue dividends</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Please connect your wallet to proceed</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Issue Dividends</CardTitle>
          <CardDescription>
            Transfer USDC dividends to investors. The transaction will be recorded on the Solana blockchain for permanent audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Investment Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Select Investment</label>
              <div className="border rounded-md p-3">
                {isLoadingInvestments ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading investments...
                  </div>
                ) : investments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No investments with ShareIssued status
                  </div>
                ) : (
                  <select
                    value={selectedInvestmentPda}
                    onChange={(e) => setSelectedInvestmentPda(e.target.value)}
                    className="w-full bg-transparent"
                    disabled={isIssuing}
                  >
                    <option value="">Choose an investment...</option>
                    {investments.map((inv) => (
                      <option key={inv.pda} value={inv.pda}>
                        {inv.pda.slice(0, 8)}...{inv.pda.slice(-8)} ({(inv.usdcAmount / 1_000_000).toFixed(2)} USDC)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Selected Investment Details */}
            {selectedInvestment && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Investor:</strong> {selectedInvestment.investor.slice(0, 8)}...{selectedInvestment.investor.slice(-8)}
                    </div>
                    <div>
                      <strong>Original Investment:</strong> {(selectedInvestment.usdcAmount / 1_000_000).toFixed(2)} USDC
                    </div>
                    <div>
                      <strong>REIT Tokens Held:</strong> {selectedInvestment.reitAmount}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Dividend Amount Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Dividend Amount (USDC)</label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={dividendAmount}
                onChange={(e) => setDividendAmount(e.target.value)}
                disabled={isIssuing}
              />
              <p className="text-xs text-muted-foreground">Enter the amount in USDC (e.g., 10.50)</p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!selectedInvestmentPda || !dividendAmount || isIssuing}
              className="w-full"
            >
              {isIssuing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Issue Dividend
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Transaction History Alert */}
      {lastTxSig && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <div className="space-y-2">
              <div>✓ Dividend issued successfully!</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{lastTxSig.slice(0, 20)}...{lastTxSig.slice(-20)}</span>
                <a
                  href={`https://explorer.solana.com/tx/${lastTxSig}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm hover:underline"
                >
                  View on Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="text-xs text-green-700 mt-2">
                The transaction is permanently recorded on the Solana blockchain for audit purposes.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Information Card */}
      <Card className="bg-slate-50">
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">1. Select Investment:</strong> Choose an investment that has completed the share issuance process.
          </p>
          <p>
            <strong className="text-foreground">2. Enter Amount:</strong> Specify the dividend amount in USDC to distribute to the investor.
          </p>
          <p>
            <strong className="text-foreground">3. Confirm & Sign:</strong> Review the details and sign the transaction with your wallet.
          </p>
          <p>
            <strong className="text-foreground">4. Permanent Record:</strong> The dividend transfer is recorded on Solana blockchain for complete auditability.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
