import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useInitializeInvestor } from '../use-initialize-investor'

export function InitializeInvestorView() {
  const { investorPDA, isCheckingPDA, isInitializing, initialize } = useInitializeInvestor()

  if (isCheckingPDA) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Checking investor status...</p>
        </div>
      </div>
    )
  }

  if (investorPDA) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Investor Initialized</h3>
            <p className="text-sm text-green-700 mt-1">
              Your investor account is ready. PDA: {investorPDA}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-yellow-900">Initialize Investor Account</h3>
          <p className="text-sm text-yellow-700 mt-1">
            You need to initialize your investor account before you can invest in REITs.
          </p>
        </div>
      </div>
      <Button
        onClick={initialize}
        disabled={isInitializing}
        className="w-full sm:w-auto"
      >
        {isInitializing ? 'Initializing...' : 'Initialize Investor Account'}
      </Button>
    </div>
  )
}
