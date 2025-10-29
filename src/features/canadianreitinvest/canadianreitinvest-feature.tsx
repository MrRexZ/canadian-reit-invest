import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { CanadianreitinvestUiProgramExplorerLink } from './ui/canadianreitinvest-ui-program-explorer-link'
import { CanadianreitinvestUiInitializeFundraiser } from './ui/canadianreitinvest-ui-initialize-fundraiser'
import { AdminDividendPage } from './ui/admin-dividend-page'
import AuthFeature from '@/features/auth/auth-feature'
import { useAuth } from '@/components/auth-provider'
import InvestorPage from '@/features/investor/investor-page'
import { useLocation } from 'react-router'
import { useState, type ReactNode } from 'react'
import BrowseReits from './ui/canadianreitinvest-ui-browse-reits'
import BrowseInvestments from './ui/canadianreitinvest-ui-browse-investments'
import { DashboardLayout, type DashboardBreadcrumb } from '@/components/dashboard-layout'
import type { AppSidebarNavKey } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { User } from '@supabase/supabase-js'

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
    return <AdminTabs account={account} user={user} />
  }

  if (role === 'investor') {
    return <InvestorPage />
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
        <div className="mt-6">
          <CanadianreitinvestUiInitializeFundraiser account={account} />
        </div>
      </AppHero>
    </div>
  )
}

function AdminTabs({ account, user }: { account: any; user?: User | null }) {
  const [tab, setTab] = useState<AppSidebarNavKey>('dashboard')

  const breadcrumbs: Record<AppSidebarNavKey, DashboardBreadcrumb[]> = {
    dashboard: [{ label: 'Dashboard' }],
    create: [
      { label: 'Dashboard' },
      { label: 'Create REIT' },
    ],
    browse: [
      { label: 'Dashboard' },
      { label: 'Browse REITs' },
    ],
    investments: [
      { label: 'Dashboard' },
      { label: 'Investments' },
    ],
    dividends: [
      { label: 'Dashboard' },
      { label: 'Issue Dividends' },
    ],
  }

  const titles: Record<AppSidebarNavKey, string> = {
    dashboard: 'Dashboard Overview',
    create: 'Create REIT',
    browse: 'Browse REITs',
    investments: 'Browse Investments',
    dividends: 'Issue Dividends',
  }

  const descriptions: Partial<Record<AppSidebarNavKey, string>> = {
    dashboard: 'High-level view of the fundraising program and quick links to key workflows.',
    create: 'Set up a new fundraiser and REIT mint for investors to join.',
    browse: 'Review existing REIT fundraisers and manage their metadata.',
    investments: 'Inspect investor commitments, statuses, and payout readiness.',
    dividends: 'Distribute accrued returns to eligible investors.',
  }

  const headerActions = undefined

  let content: ReactNode = null

  switch (tab) {
    case 'dashboard': {
      content = (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>
                Monitor your fundraising activity and manage investor actions from this console.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              We are working on richer analytics for this dashboard. In the meantime, use the quick
              actions and navigation to manage REITs and payouts.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Jump directly into common admin workflows.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setTab('create')}>
                Create REIT
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTab('browse')}>
                Browse REITs
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTab('dividends')}>
                Issue Dividends
              </Button>
            </CardContent>
          </Card>
        </div>
      )
      break
    }
    case 'create': {
      content = (
        <div className="space-y-6 max-w-2xl">
          <CanadianreitinvestUiInitializeFundraiser account={account} />
        </div>
      )
      break
    }
    case 'browse': {
      content = <BrowseReits />
      break
    }
    case 'investments': {
      content = <BrowseInvestments isAdmin={true} />
      break
    }
    case 'dividends': {
      content = <AdminDividendPage account={account} />
      break
    }
    default:
      content = null
  }

  return (
    <DashboardLayout
      role="admin"
      activeItem={tab}
      onSelect={setTab}
      breadcrumbs={breadcrumbs[tab]}
      title={titles[tab]}
      description={descriptions[tab]}
      headerActions={headerActions}
      userEmail={user?.email}
      userName={typeof user?.user_metadata?.full_name === 'string' ? user?.user_metadata?.full_name : undefined}
    >
      {content}
    </DashboardLayout>
  )
}
