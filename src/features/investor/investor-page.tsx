import { useAuth } from '@/components/auth-provider'
import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import BrowseReitsInvestor from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-browse-reits-investor'
import BrowseInvestments from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-browse-investments'
import { InitializeInvestorView } from './ui/initialize-investor-view'
import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export default function InvestorPage() {
  const { user } = useAuth()
  const { account } = useSolana()
  const [tab, setTab] = useState<'browse' | 'investments'>('browse')

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

  // Type-safe wrapper for setTab
  const handleTabChange = (newTab: string) => {
    if (newTab === 'browse' || newTab === 'investments') {
      setTab(newTab)
    }
  }

  const breadcrumbMap: Record<string, { label: string }[]> = {
    'browse': [{ label: 'Browse REITs' }],
    'investments': [{ label: 'My Investments' }],
  }

  const currentBreadcrumbs = breadcrumbMap[tab] || breadcrumbMap['browse']

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <button onClick={() => handleTabChange('browse')} className="hover:underline">
              Dashboard
            </button>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {currentBreadcrumbs.map((crumb, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )

  const renderContent = () => {
    switch (tab) {
      case 'browse':
        return <BrowseReitsInvestor account={account} />
      case 'investments':
        return <BrowseInvestments userId={user?.id} />
      default:
        return null
    }
  }

  return (
    <DashboardLayout
      role="investor"
      activeTab={tab}
      onTabChange={handleTabChange}
      breadcrumb={breadcrumb}
    >
      <div className="pb-4 mb-6 border-b">
        <h1 className="text-4xl font-bold">Investor Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {user?.email ? `Welcome, ${user.email}` : 'Welcome to your investment dashboard'}
        </p>
      </div>

      <div className="mb-6">
        <InitializeInvestorView />
      </div>

      {renderContent()}
    </DashboardLayout>
  )
}
