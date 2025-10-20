import { useRoutes } from 'react-router'
import { lazy } from 'react'
import { ProtectedRoute } from '@/components/protected-route'

const AccountDetailFeature = lazy(() => import('@/features/account/account-feature-detail.tsx'))
const AccountIndexFeature = lazy(() => import('@/features/account/account-feature-index.tsx'))
const AuthFeature = lazy(() => import('@/features/auth/auth-feature'))
const CanadianreitinvestFeature = lazy(() => import('@/features/canadianreitinvest/canadianreitinvest-feature'))
const DashboardFeature = lazy(() => import('@/features/dashboard/dashboard-feature'))

export function AppRoutes() {
  return useRoutes([
    {
      path: 'auth',
      element: <AuthFeature />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <DashboardFeature />
        </ProtectedRoute>
      ),
    },
    {
      path: 'account',
      element: (
        <ProtectedRoute>
          <div />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <AccountIndexFeature /> },
        { path: ':address', element: <AccountDetailFeature /> },
      ],
    },
    {
      path: 'canadianreitinvest',
      element: (
        <ProtectedRoute>
          <CanadianreitinvestFeature />
        </ProtectedRoute>
      ),
    },
  ])
}
