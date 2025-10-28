import { useAuth } from '@/components/auth-provider'
import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import BrowseReitsInvestor from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-browse-reits-investor'
import BrowseInvestments from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-browse-investments'
import { InitializeInvestorView } from './ui/initialize-investor-view'
import { LocalnetMintTokens } from '@/features/localnet-management/ui/localnet-mint-tokens'
import { useState } from 'react'

export default function InvestorPage() {
  const { user } = useAuth()
  const { account } = useSolana()
  const [tab, setTab] = useState<'mint' | 'browse' | 'investments'>('browse')

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
    <div className="flex gap-0">
      <aside className="p-4 bg-sidebar border-r fixed left-0 top-[52px] bottom-0 w-[220px] z-10 overflow-y-auto">
        <nav className="flex flex-col space-y-2">
          <button
            className={`text-left px-3 py-2 rounded-md ${tab === 'mint' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent'}`}
            onClick={() => setTab('mint')}
          >
            Mint USDC Tokens
          </button>
          <button
            className={`text-left px-3 py-2 rounded-md ${tab === 'browse' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent'}`}
            onClick={() => setTab('browse')}
          >
            Browse REITs
          </button>
          <button
            className={`text-left px-3 py-2 rounded-md ${tab === 'investments' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent'}`}
            onClick={() => setTab('investments')}
          >
            Browse Investments
          </button>
        </nav>
      </aside>

      <section className="ml-[220px] flex-1 p-6">
        <div className="pb-4 mb-6 border-b">
          <h1 className="text-4xl font-bold">Investor Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            {user?.email ? `Welcome, ${user.email}` : 'Welcome to your investment dashboard'}
          </p>
        </div>

        <div className="mb-6">
          <InitializeInvestorView />
        </div>

        {tab === 'mint' ? (
          <div>
            <div className="pb-4">
              <h1 className="text-2xl font-bold">Mint USDC Tokens</h1>
              <p className="mt-2 text-muted-foreground">Mint USDC tokens for testing on localnet</p>
            </div>

            <div className="space-y-6 max-w-md">
              <LocalnetMintTokens account={account} />
            </div>
          </div>
        ) : tab === 'browse' ? (
          <div>
            <BrowseReitsInvestor account={account} />
          </div>
        ) : (
          <div>
            <BrowseInvestments userId={user?.id} />
          </div>
        )}
      </section>
    </div>
  )
}
