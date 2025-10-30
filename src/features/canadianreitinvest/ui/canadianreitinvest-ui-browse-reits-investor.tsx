import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UiWalletAccount } from '@wallet-ui/react'
import { CanadianreitinvestUiInvest } from './canadianreitinvest-ui-invest'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useReitsInvestorQuery } from '../data-access/use-reits-investor-query'
import type { ReitData } from '../data-access/use-reits-investor-query'

export default function BrowseReitsInvestor({ account }: { account: UiWalletAccount }) {
  const [selectedReit, setSelectedReit] = useState<ReitData | null>(null)

  // Use React Query hook for data fetching and automatic polling/invalidation
  const { data: reits = [], isLoading, error } = useReitsInvestorQuery()

  const handleCloseInvestModal = () => {
    setSelectedReit(null)
  }

  if (isLoading) return <span className="loading loading-spinner loading-md" />
  if (error) return <div className="text-red-600">Error: {error instanceof Error ? error.message : String(error)}</div>

  if (!isLoading && reits.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-2">Available REITs</h2>
        <div className="p-6 border rounded-md text-muted-foreground">
          No REITs available at this time. Check back soon!
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Available REITs</h2>
        <p className="text-muted-foreground">Click on any REIT to invest</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reits.map((reit) => {
          const totalRaisedBigInt = reit.calculatedTotalRaised ?? 0
          const totalRaised = typeof totalRaisedBigInt === 'bigint' ? Number(totalRaisedBigInt) : totalRaisedBigInt
          // Convert from minor units (6 decimals) to major units (dollars)
          const totalRaisedDollars = totalRaised / 1_000_000
          const targetAmount = 2000000 // TODO: add to fundraiser PDA or supabase - this is in dollars
          const progressPercent = targetAmount > 0 ? (totalRaisedDollars / targetAmount) * 100 : 0
          const remaining = Math.max(0, targetAmount - totalRaisedDollars)

          // Format amount display
          const formatAmount = (amount: number) => {
            if (amount >= 1_000_000) {
              return `$${(amount / 1_000_000).toFixed(2)}M`
            } else if (amount >= 1_000) {
              return `$${(amount / 1_000).toFixed(1)}K`
            } else {
              return `$${amount.toFixed(2)}`
            }
          }

          return (
            <div
              key={reit.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedReit(reit)}
            >
              <h3 className="text-lg font-semibold mb-2">{reit.reit_name || 'Unnamed REIT'}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Investment opportunity in {reit.reit_name || 'this REIT'}
              </p>

              <div className="space-y-3">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Progress</span>
                    <span className="text-muted-foreground">
                      {progressPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Amount Info */}
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Raised:</span>
                    <span className="font-medium">
                      {formatAmount(totalRaisedDollars)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <span className="font-medium">
                      {formatAmount(targetAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground mt-1">
                    <span>Remaining:</span>
                    <span>{formatAmount(remaining)}</span>
                  </div>
                </div>

                {/* Invest Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedReit(reit)
                  }}
                  className="w-full"
                >
                  Invest
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Invest Modal Dialog */}
      <Dialog open={selectedReit !== null} onOpenChange={(open) => !open && handleCloseInvestModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedReit ? `Invest in ${selectedReit.reit_name}` : 'Invest'}</DialogTitle>
          </DialogHeader>

          {selectedReit && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Fund Details</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="font-medium">{selectedReit.reit_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Raised:</span>
                    <span className="font-medium">
                      ${((selectedReit.calculatedTotalRaised || 0) / 1000000).toFixed(2)} USDC
                    </span>
                  </div>
                </div>
              </div>

              {/* Invest Form */}
              <CanadianreitinvestUiInvest
                account={account}
                reitId={selectedReit.id}
                onSuccess={handleCloseInvestModal}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
