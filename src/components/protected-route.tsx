import { useAuth } from '@/components/auth-provider'
import { Navigate, useLocation } from 'react-router'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, role, roleLoading } = useAuth()
  const location = useLocation()

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    // Redirect to root (auth UI is shown inline on the main page)
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (requiredRole) {
    if (requiredRole && role !== requiredRole) {
      // If user doesn't have the required role, redirect to root
      return <Navigate to="/" state={{ from: location }} replace />
    }
  }

  return <>{children}</>
}