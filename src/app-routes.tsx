import { useRoutes } from 'react-router'
import { lazy } from 'react'
import { ProtectedRoute } from '@/components/protected-route'

const AuthFeature = lazy(() => import('@/features/auth/auth-feature'))
const CanadianreitinvestFeature = lazy(() => import('@/features/canadianreitinvest/canadianreitinvest-feature'))

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
          <CanadianreitinvestFeature />
        </ProtectedRoute>
      ),
    },
  ])
}
