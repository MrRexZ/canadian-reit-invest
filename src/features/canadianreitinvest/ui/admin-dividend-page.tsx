import { useState, useMemo } from 'react'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Check, AlertCircle, ExternalLink, ChevronDown } from 'lucide-react'
import { useIssueDividend } from '../hooks/use-issue-dividend'
import { InvestmentStatus } from '@/generated/types'
import { useInvestmentsQuery } from '../data-access/use-investments-query'
import { toast } from 'sonner'

interface AdminDividendPageProps {
  account: UiWalletAccount
}

export function AdminDividendPage({ account }: AdminDividendPageProps) {
  const [selectedInvestmentPda, setSelectedInvestmentPda] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dividendAmount, setDividendAmount] = useState<string>('')
  const [lastTxSig, setLastTxSig] = useState<string>('')

  const { mutate: issueDividend, isPending: isIssuing } = useIssueDividend({
    account,
  })

  // Fetch all investments with ShareIssued status
  const { data: allInvestments = [], isLoading: isLoadingInvestments } = useInvestmentsQuery({
    isAdmin: true,
  })

  // Filter investments to only those with ShareIssued status
  const shareIssuedInvestments = useMemo(() => {
    return allInvestments.filter((inv) => {
      const status = inv.investment?.data?.status
      return status === InvestmentStatus.ShareIssued
    })
  }, [allInvestments])

  // Filter by search input
  const filteredInvestments = useMemo(() => {
    if (!searchInput.trim()) return shareIssuedInvestments

    const query = searchInput.toLowerCase()
    return shareIssuedInvestments.filter((inv) => {
      const pdaMatch = inv.investment_pda.toLowerCase().includes(query)
      const nameMatch = (inv.user_name || '').toLowerCase().includes(query)
      const emailMatch = (inv.user_email || '').toLowerCase().includes(query)
      const reitMatch = (inv.reit_name || '').toLowerCase().includes(query)
      return pdaMatch || nameMatch || emailMatch || reitMatch
    })
  }, [searchInput, shareIssuedInvestments])

  // Get selected investment data
  const selectedInvestment = useMemo(() => {
    return allInvestments.find((inv) => inv.investment_pda === selectedInvestmentPda)
  }, [allInvestments, selectedInvestmentPda])

  const handleSelectInvestment = (pda: string) => {
    setSelectedInvestmentPda(pda)
    setSearchInput('')
    setIsDropdownOpen(false)
  }

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
          setSearchInput('')
          const investorDisplay = selectedInvestment?.user_name || result.investor.slice(0, 8)
          toast.success(`Dividend issued: ${result.amount} USDC to ${investorDisplay}`)
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
            {/* Investment Selection - Searchable Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Select Investment</label>
              <div className="relative">
                <div className="border rounded-md bg-white">
                  <div className="flex items-center">
                    <Input
                      type="text"
                      placeholder="Search by investment ID, investor name, email, or REIT name..."
                      value={searchInput || (selectedInvestment ? `${selectedInvestment.investment_pda.slice(0, 8)}...${selectedInvestment.investment_pda.slice(-8)}` : '')}
                      onChange={(e) => {
                        setSearchInput(e.target.value)
                        setIsDropdownOpen(true)
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      disabled={isLoadingInvestments || isIssuing}
                      className="border-0 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      disabled={isLoadingInvestments || isIssuing}
                      className="px-3 py-2"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Dropdown Options */}
                  {isDropdownOpen && (
                    <div className="border-t max-h-64 overflow-y-auto">
                      {isLoadingInvestments ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Loading investments...</span>
                        </div>
                      ) : filteredInvestments.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          {shareIssuedInvestments.length === 0
                            ? 'No investments with ShareIssued status'
                            : 'No matching investments'}
                        </div>
                      ) : (
                        filteredInvestments.map((inv) => {
                          const usdcAmount = inv.investment?.data?.usdcAmount
                            ? Number(inv.investment.data.usdcAmount) / 1_000_000
                            : 0
                          const isSelected = inv.investment_pda === selectedInvestmentPda

                          return (
                            <button
                              key={inv.investment_pda}
                              type="button"
                              onClick={() => handleSelectInvestment(inv.investment_pda)}
                              className={`w-full text-left px-4 py-3 hover:bg-slate-100 border-b last:border-b-0 transition ${
                                isSelected ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-mono text-sm font-medium">
                                    {inv.investment_pda}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                    {inv.user_name && <div>Investor: {inv.user_name}</div>}
                                    {inv.user_email && <div className="truncate">Email: {inv.user_email}</div>}
                                    {inv.reit_name && <div>REIT: {inv.reit_name}</div>}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-sm font-medium">
                                    {usdcAmount.toFixed(2)} USDC
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selected Investment Details */}
            {selectedInvestment && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Investment ID:</strong> {selectedInvestment.investment_pda}
                    </div>
                    {selectedInvestment.user_name && (
                      <div>
                        <strong>Investor Name:</strong> {selectedInvestment.user_name}
                      </div>
                    )}
                    {selectedInvestment.user_email && (
                      <div>
                        <strong>Investor Email:</strong> {selectedInvestment.user_email}
                      </div>
                    )}
                    {selectedInvestment.reit_name && (
                      <div>
                        <strong>REIT Name:</strong> {selectedInvestment.reit_name}
                      </div>
                    )}
                    <div>
                      <strong>Original Investment:</strong>{' '}
                      {selectedInvestment.investment?.data?.usdcAmount
                        ? (Number(selectedInvestment.investment.data.usdcAmount) / 1_000_000).toFixed(2)
                        : '0.00'}{' '}
                      USDC
                    </div>
                    <div>
                      <strong>REIT Tokens Held:</strong> {selectedInvestment.investment?.data?.reitAmount || 0}
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
