import React, { useState } from 'react'
import { useInvest } from '@/features/canadianreitinvest/hooks/use-invest'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

    if (!reitId) {
      setError('REIT ID is required')
      return
    }

    try {
      await invest.mutateAsync({
        amount: numAmount,
        reitIdHash: Buffer.from(reitId.split('-').join(''), 'hex') as unknown as Uint8Array,
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
            placeholder="Enter amount to invest"
            disabled={invest.isPending}
          />
          <p className="text-xs text-muted-foreground mt-1">
            You can invest any amount in USDC
          </p>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
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
