import React from 'react'
import { useAuth } from '@/components/auth-provider'
import { ClusterUiChecker } from '@/features/cluster/ui/cluster-ui-checker'
import { AccountUiChecker } from '@/features/account/ui/account-ui-checker'
import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'
import { AppHeader } from './app-header'
import { AppFooter } from './app-footer'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, user } = useAuth()

  // Only show tabs if user is logged in and has a role
  const links: { label: string; path: string }[] = []
  if (user && role) {
    if (role === 'admin') {
      links.push({ label: 'Admin Dashboard', path: '/' })
    } else if (role === 'investor') {
      links.push({ label: 'Investor Dashboard', path: '/' })
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="flex flex-col min-h-screen">
        <AppHeader links={links} />
        <main className="flex-grow container mx-auto p-4">
          <ClusterUiChecker>
            <AccountUiChecker />
          </ClusterUiChecker>
          {children}
        </main>
        <AppFooter />
      </div>
      <Toaster closeButton />
    </ThemeProvider>
  )
}
