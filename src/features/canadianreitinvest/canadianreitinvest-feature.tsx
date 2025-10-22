import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { CanadianreitinvestUiProgramExplorerLink } from './ui/canadianreitinvest-ui-program-explorer-link'
import { CanadianreitinvestUiProgram } from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-program'
import { CanadianreitinvestUiInitializeFundraiser } from './ui/canadianreitinvest-ui-initialize-fundraiser'
import { CanadianreitinvestUiCreateUsdcMint } from './ui/canadianreitinvest-ui-create-usdc-mint'
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

  console.log('[CanadianreitinvestFeature] Current state - user:', user?.id, 'role:', role, 'loading:', loading, 'roleLoading:', roleLoading, 'account:', account?.publicKey)

  // While auth or role is loading
  if (loading || roleLoading) {
    console.log('[CanadianreitinvestFeature] Loading state, showing loading screen')
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
    console.log('[CanadianreitinvestFeature] No user or forceShowAuth, showing auth UI')
    return <AuthFeature />
  }

  // If user is authenticated and role is loaded, render based on role
  if (role === 'admin') {
    console.log('[CanadianreitinvestFeature] Role is admin, showing Admin Fundraiser Dashboard')
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
        <div className="mb-4 p-2 border rounded-md bg-base-100">
          <div className="flex gap-2">
            {/* We'll manage the tab state below */}
          </div>
        </div>
        <AdminTabs account={account} />
      </div>
    )
  }

  if (role === 'investor') {
    console.log('[CanadianreitinvestFeature] Role is investor, showing InvestorPage')
    return <InvestorPage />
  }

  if (!account) {
    console.log('[CanadianreitinvestFeature] No account, showing wallet dropdown')
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
      <AppHero title="Admin Fundraiser Dashboard" subtitle={'Admin Fundraiser Dashboard'}>
        <p className="mb-6">
          <CanadianreitinvestUiProgramExplorerLink />
        </p>
        <CanadianreitinvestUiCreateUsdcMint account={account} />
        <div className="mt-6">
          <CanadianreitinvestUiInitializeFundraiser account={account} />
        </div>
      </AppHero>
      <CanadianreitinvestUiProgram />
    </div>
  )
}

function AdminTabs({ account }: { account: any }) {
  const [tab, setTab] = useState<'create' | 'browse'>('create')

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button className={`btn btn-sm ${tab === 'create' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('create')}>Create REIT</button>
        <button className={`btn btn-sm ${tab === 'browse' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('browse')}>Browse REITs</button>
      </div>

      {tab === 'create' ? (
        <div>
          <AppHero title="Create REIT" subtitle={'Create a new REIT and initialize its fundraiser'}>
            <p className="mb-6">
              <CanadianreitinvestUiProgramExplorerLink />
            </p>
            <CanadianreitinvestUiCreateUsdcMint account={account} />
            <div className="mt-6">
              <CanadianreitinvestUiInitializeFundraiser account={account} />
            </div>
          </AppHero>
          <CanadianreitinvestUiProgram />
        </div>
      ) : (
        <BrowseReits />
      )}
    </div>
  )
}
