import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { AppSidebar, AppSidebarNavKey, AppSidebarRole } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'

export type DashboardBreadcrumb = {
  label: string
  href?: string
}

type DashboardLayoutProps = {
  role: AppSidebarRole
  activeItem: AppSidebarNavKey
  onSelect: (value: AppSidebarNavKey) => void
  breadcrumbs: DashboardBreadcrumb[]
  title: string
  description?: string
  headerActions?: ReactNode
  children: ReactNode
  userEmail?: string | null
  userName?: string | null
}

export function DashboardLayout({
  role,
  activeItem,
  onSelect,
  breadcrumbs,
  title,
  description,
  headerActions,
  children,
  userEmail,
  userName,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        role={role}
        activeItem={activeItem}
        onSelect={onSelect}
        userEmail={userEmail}
        userName={userName}
      />
      <SidebarInset className="flex min-h-screen flex-1 flex-col bg-background">
        <header className="sticky top-0 z-20 bg-background px-6 pb-4 pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1

                    return (
                      <Fragment key={`${crumb.label}-${index}`}>
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                          ) : crumb.href ? (
                            <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                          ) : (
                            <span className="text-muted-foreground">{crumb.label}</span>
                          )}
                        </BreadcrumbItem>
                        {!isLast ? <BreadcrumbSeparator /> : null}
                      </Fragment>
                    )
                  })}
                </BreadcrumbList>
              </Breadcrumb>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
                {description ? <p className="text-sm text-muted-foreground md:text-base">{description}</p> : null}
              </div>
            </div>
            {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
          </div>
        </header>
        <Separator />
        <div className="flex-1 overflow-auto px-6 py-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
