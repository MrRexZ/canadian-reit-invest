import React, { useState } from 'react'
import { useInvest } from '@/features/canadianreitinvest/hooks/use-invest'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parse as uuidParse } from 'uuid'
import { useAuth } from '@/components/auth-provider'

export function CanadianreitinvestUiInvest({
  account,
  reitId,
  onSuccess,
}: {
  account: UiWalletAccount
  reitId?: string
  onSuccess?: () => void
}) {
  const invest = useInvest({ account })
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!amount) {
      setError('Please enter an amount')
      return
    }

    const numAmount = Number(amount)
    if (numAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    // Check for too many decimal places (USDC supports up to 6 decimals)
    if (amount.includes('.') && amount.split('.')[1].length > 6) {
      setError('Amount cannot have more than 6 decimal places')
      return
    }

    if (!reitId) {
      setError('REIT ID is required')
      return
    }

    if (!user) {
      setError('User not authenticated')
      return
    }

    try {
      // Convert major unit amount to minor units (USDC has 6 decimals)
      const minorUnitAmount = Math.round(numAmount * 1_000_000)

      await invest.mutateAsync({
        amount: minorUnitAmount,
        reitIdHash: uuidParse(reitId) as unknown as Uint8Array,
        reitId: reitId,
        userId: user.id,
      })

      setAmount('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Investment failed')
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="amount">Amount (USDC)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100.50"
            disabled={invest.isPending}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter the amount in USDC (e.g., 100.50 for $100.50)
          </p>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded space-y-2">
            <p>{error}</p>
            {error.includes('insufficient funds') && (
              <p className="text-xs">
                💡 <strong>Tip:</strong> You need USDC tokens to invest. On localnet, run:<br />
                <code className="bg-black/50 px-1 rounded">./scripts/mint-usdc-tokens.sh {account.publicKey} 1000</code>
              </p>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={invest.isPending || !amount}
          className="w-full"
        >
          {invest.isPending ? 'Investing...' : 'Invest'}
        </Button>
      </form>
    </div>
  )
}
