
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { UserDropdown } from '@/components/user-dropdown'
import type { ReactNode } from 'react'
import { BarChart3, Building2, DollarSign, Home, Users } from 'lucide-react'

export type AppSidebarNavKey =
  | 'dashboard'
  | 'create'
  | 'browse'
  | 'investments'
  | 'dividends'

export type AppSidebarRole = 'admin' | 'investor'

type NavigationConfig = {
  icon: ReactNode
  label: string
  value: AppSidebarNavKey
}

type AppSidebarProps = {
  role: AppSidebarRole
  activeItem: AppSidebarNavKey
  onSelect: (value: AppSidebarNavKey) => void
  userEmail?: string | null
  userName?: string | null
}

const adminNavigation: NavigationConfig[] = [
  { icon: <Home className="size-4" />, label: 'Dashboard', value: 'dashboard' },
  { icon: <Building2 className="size-4" />, label: 'Create REIT', value: 'create' },
  { icon: <Building2 className="size-4" />, label: 'Browse REITs', value: 'browse' },
  { icon: <BarChart3 className="size-4" />, label: 'Browse Investments', value: 'investments' },
  { icon: <DollarSign className="size-4" />, label: 'Issue Dividends', value: 'dividends' },
]

const investorNavigation: NavigationConfig[] = [
  { icon: <Home className="size-4" />, label: 'Dashboard', value: 'dashboard' },
  { icon: <Building2 className="size-4" />, label: 'Browse REITs', value: 'browse' },
  { icon: <Users className="size-4" />, label: 'My Investments', value: 'investments' },
]

export function AppSidebar({ role, activeItem, onSelect }: AppSidebarProps) {
  const navigation = role === 'admin' ? adminNavigation : investorNavigation

  const consoleLabel = role === 'admin' ? 'Admin Dashboard' : 'Investor Console'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center font-semibold text-primary">
            CR
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">CAD REITs</span>
            <span className="text-xs text-muted-foreground">{consoleLabel}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    isActive={activeItem === item.value}
                    onClick={() => onSelect(item.value)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-2">
          <WalletDropdown variant="icon" />
          <UserDropdown variant="sidebar" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}