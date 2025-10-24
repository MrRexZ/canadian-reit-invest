import { useAuth } from '@/components/auth-provider'
import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import BrowseReitsInvestor from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-browse-reits-investor'
import { InitializeInvestorView } from './ui/initialize-investor-view'

export default function InvestorPage() {
  const { user } = useAuth()
  const { account } = useSolana()

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="hero py-[64px]">
          <div className="hero-content text-center">
            <WalletDropdown />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="pb-4 mb-6 border-b">
        <h1 className="text-4xl font-bold">Investor Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {user?.email ? `Welcome, ${user.email}` : 'Welcome to your investment dashboard'}
        </p>
      </div>

      <div className="mb-6">
        <InitializeInvestorView />
      </div>

      <BrowseReitsInvestor account={account} />
    </div>
  )
}
