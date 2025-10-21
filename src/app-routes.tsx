import { useRoutes } from 'react-router'
import { lazy } from 'react'

const CanadianreitinvestFeature = lazy(() => import('@/features/canadianreitinvest/canadianreitinvest-feature'))

export function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: <CanadianreitinvestFeature />,
    },
  ])
}
