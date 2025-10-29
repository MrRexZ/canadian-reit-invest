import { Building2, BarChart3, FileText, Users } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"

type AppSidebarProps = {
  role: "admin" | "investor"
  activeTab: string
  onTabChange: (tab: string) => void
}

export function AppSidebar({ role, activeTab, onTabChange }: AppSidebarProps) {
  const adminMenuItems = [
    { id: "create", label: "Create REIT", icon: Building2 },
    { id: "browse", label: "Browse REITs", icon: BarChart3 },
    { id: "investments", label: "Browse Investments", icon: FileText },
    { id: "dividends", label: "Issue Dividends", icon: Users },
  ]

  const investorMenuItems = [
    { id: "browse", label: "Browse REITs", icon: BarChart3 },
    { id: "investments", label: "My Investments", icon: FileText },
  ]

  const menuItems = role === "admin" ? adminMenuItems : investorMenuItems

  return (
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarHeader className="px-4 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            C
          </div>
          <div>
            <h1 className="font-semibold text-sm">Canadian REIT</h1>
            <p className="text-xs text-muted-foreground">Invest & Earn</p>
          </div>
          <div className="ml-auto md:hidden">
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeTab === item.id}
                      onClick={() => onTabChange(item.id)}
                      className="cursor-pointer"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
