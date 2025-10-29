import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

export function AppSidebar({ role, activeItem, onSelect, userEmail, userName }: AppSidebarProps) {
  const navigation = role === 'admin' ? adminNavigation : investorNavigation
  const initials = (userName || userEmail)?.[0]?.toUpperCase() ?? 'U'
  const displayName = userName ?? userEmail ?? 'User'
  const consoleLabel = role === 'admin' ? 'Admin Console' : 'Investor Console'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center font-semibold text-primary">
            CR
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">Canadian REIT</span>
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
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>
            {userEmail ? (
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            ) : null}
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}