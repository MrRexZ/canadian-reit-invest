import React from 'react'
import { ClusterUiChecker } from '@/features/cluster/ui/cluster-ui-checker'
import { AccountUiChecker } from '@/features/account/ui/account-ui-checker'
import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <ClusterUiChecker>
            <AccountUiChecker />
          </ClusterUiChecker>
          {children}
        </main>
      </div>
      <Toaster closeButton />
    </ThemeProvider>
  )
}
