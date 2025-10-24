export function InitializeInvestorView() {
  // Investor PDA is now created automatically when investing, so this component is no longer needed.
  // Keeping it for now to show status, but buttons are removed.
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Investor Account</h3>
              <p className="text-sm text-blue-700 mt-1">
                Investor accounts are created automatically when you make your first investment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
