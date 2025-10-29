import { useAuth } from '@/components/auth-provider'
import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import BrowseReitsInvestor from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-browse-reits-investor'
import BrowseInvestments from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-browse-investments'
import { InitializeInvestorView } from './ui/initialize-investor-view'
import { useState, type ReactNode } from 'react'
import { DashboardLayout, type DashboardBreadcrumb } from '@/components/dashboard-layout'
import type { AppSidebarNavKey } from '@/components/app-sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function InvestorPage() {
  const { user } = useAuth()
  const { account } = useSolana()
  type InvestorTab = 'dashboard' | 'browse' | 'investments'
  const [tab, setTab] = useState<InvestorTab>('dashboard')

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

  const breadcrumbs: Record<InvestorTab, DashboardBreadcrumb[]> = {
    dashboard: [{ label: 'Dashboard' }],
    browse: [
      { label: 'Dashboard' },
      { label: 'Browse REITs' },
    ],
    investments: [
      { label: 'Dashboard' },
      { label: 'My Investments' },
    ],
  }

  const titles: Record<InvestorTab, string> = {
    dashboard: 'Investor Dashboard',
    browse: 'Browse REIT Opportunities',
    investments: 'My Investments',
  }

  const descriptions: Partial<Record<InvestorTab, string>> = {
    dashboard: 'Track your investor profile and stay informed about new offerings.',
    browse: 'Discover active Canadian REIT fundraisers and invest using your connected wallet.',
    investments: 'Review the status of your investments and upcoming dividend events.',
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      {tab !== 'browse' ? (
        <Button size="sm" onClick={() => setTab('browse')}>
          Browse REITs
        </Button>
      ) : null}
      <WalletDropdown />
    </div>
  )

  let content: ReactNode = null

  switch (tab) {
    case 'dashboard': {
      content = (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome {user?.email ? user.email : 'Investor'}</CardTitle>
              <CardDescription>
                Complete the investor setup steps below to start participating in Canadian REIT
                offerings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InitializeInvestorView />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Access frequent investor tasks.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setTab('browse')}>
                Explore REITs
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTab('investments')}>
                View My Investments
              </Button>
            </CardContent>
          </Card>
        </div>
      )
      break
    }
    case 'browse': {
      content = <BrowseReitsInvestor account={account} />
      break
    }
    case 'investments': {
      content = <BrowseInvestments userId={user?.id} />
      break
    }
    default:
      content = null
  }

  const handleSelect = (value: AppSidebarNavKey) => {
    if (value === 'dashboard' || value === 'browse' || value === 'investments') {
      setTab(value)
    }
  }

  return (
    <DashboardLayout
      role="investor"
      activeItem={tab}
      onSelect={handleSelect}
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
