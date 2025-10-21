import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { CanadianreitinvestUiProgramExplorerLink } from './ui/canadianreitinvest-ui-program-explorer-link'
import { CanadianreitinvestUiProgram } from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-program'
import { CanadianreitinvestUiInitializeFundraiser } from './ui/canadianreitinvest-ui-initialize-fundraiser'
import { CanadianreitinvestUiCreateUsdcMint } from './ui/canadianreitinvest-ui-create-usdc-mint'
import AuthFeature from '@/features/auth/auth-feature'
import { useAuth } from '@/components/auth-provider'
import { useLocation } from 'react-router'

export default function CanadianreitinvestFeature() {
  const { account } = useSolana()
  const { user, loading } = useAuth()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const forceShowAuth = params.get('showAuth') === '1'

  // While auth is loading, you can show a loading state or wallet connect
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="hero py-[64px]">
          <div className="hero-content text-center">Loading…</div>
        </div>
      </div>
    )
  }

  // If no Supabase user, show auth UI (moved from /auth)
  if (forceShowAuth || !user) {
    return <AuthFeature />
  }

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
