import { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./ui/sidebar";
import { Separator } from "./ui/separator";
import { ClusterDropdown } from "./cluster-dropdown";
import { WalletDropdown } from "./wallet-dropdown";
import { ThemeSelect } from "./theme-select";

interface DashboardLayoutProps {
  children: ReactNode;
  breadcrumb?: ReactNode;
  headerContent?: ReactNode;
  role: "admin" | "investor";
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DashboardLayout({ 
  children, 
  breadcrumb,
  headerContent,
  role,
  activeTab,
  onTabChange
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar role={role} activeTab={activeTab} onTabChange={onTabChange} />
      <SidebarInset className="md:peer-data-[variant=sidebar]:pl-[--sidebar-width] md:peer-data-[state=collapsed]:pl-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-4" />
            {breadcrumb}
            <div className="ml-auto flex items-center gap-3">
              {headerContent}
              <ClusterDropdown />
              <WalletDropdown />
              <ThemeSelect />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
