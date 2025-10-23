import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { CanadianreitinvestUiProgramExplorerLink } from './ui/canadianreitinvest-ui-program-explorer-link'
import { CanadianreitinvestUiInitializeFundraiser } from './ui/canadianreitinvest-ui-initialize-fundraiser'
import { CanadianreitinvestUiCreateUsdcMint } from './ui/canadianreitinvest-ui-create-usdc-mint'
import { CanadianreitinvestUiUsdcLocalnetManagement } from './ui/canadianreitinvest-ui-usdc-localnet-management'
import AuthFeature from '@/features/auth/auth-feature'
import { useAuth } from '@/components/auth-provider'
import InvestorPage from '@/features/investor/investor-page'
import { useLocation } from 'react-router'
import { useState } from 'react'
import BrowseReits from './ui/canadianreitinvest-ui-browse-reits'

export default function CanadianreitinvestFeature() {
  const { account } = useSolana()
  const { user, loading, roleLoading, role } = useAuth()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const forceShowAuth = params.get('showAuth') === '1'

  // Current auth and account state

  // While auth or role is loading
  if (loading || roleLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="hero py-[64px]">
          <div className="hero-content text-center">Loading…</div>
        </div>
      </div>
    )
  }

  // If no Supabase user, show auth UI
  if (forceShowAuth || !user) {
    return <AuthFeature />
  }

  // If user is authenticated and role is loaded, render based on role
  if (role === 'admin') {
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
      <div>
        {/* Top-level admin tabs: Create REIT and Browse REITs */}
        <AdminTabs account={account} />
      </div>
    )
  }

  if (role === 'investor') {
    return <InvestorPage />
  }

  // Default fallback for unknown roles or no account
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

  return null
}

function AdminTabs({ account }: { account: any }) {
  const [tab, setTab] = useState<'create' | 'browse' | 'usdc-localnet'>('create')

  return (
    <div className="flex gap-0">
      <aside className="p-4 bg-sidebar border-r fixed left-0 top-[52px] bottom-0 w-[220px] z-10 overflow-y-auto">
        <nav className="flex flex-col space-y-2">
          <button
            className={`text-left px-3 py-2 rounded-md ${tab === 'create' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent'}`}
            onClick={() => setTab('create')}
          >
            Create REIT
          </button>
          <button
            className={`text-left px-3 py-2 rounded-md ${tab === 'browse' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent'}`}
            onClick={() => setTab('browse')}
          >
            Browse REITs
          </button>
          <button
            className={`text-left px-3 py-2 rounded-md ${tab === 'usdc-localnet' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent'}`}
            onClick={() => setTab('usdc-localnet')}
          >
            USDC Localnet
          </button>
        </nav>
      </aside>

      <section className="ml-[220px] flex-1 p-6">
        {tab === 'create' ? (
          <div>
            <div className="pb-4">
              <h1 className="text-4xl font-bold">Create REIT</h1>
              <p className="mt-2 text-muted-foreground">Create a new REIT and initialize its fundraiser</p>
              <div className="mt-3"><CanadianreitinvestUiProgramExplorerLink /></div>
            </div>

            <div className="space-y-6 max-w-md">
              <CanadianreitinvestUiCreateUsdcMint />
              <CanadianreitinvestUiInitializeFundraiser account={account} />
            </div>
          </div>
        ) : tab === 'browse' ? (
          <div>
            <BrowseReits />
          </div>
        ) : (
          <div>
            <div className="pb-4">
              <h1 className="text-4xl font-bold">USDC Localnet</h1>
              <p className="mt-2 text-muted-foreground">Manage USDC token for localnet testing</p>
            </div>

            <div className="space-y-6 max-w-2xl">
              <CanadianreitinvestUiUsdcLocalnetManagement />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
