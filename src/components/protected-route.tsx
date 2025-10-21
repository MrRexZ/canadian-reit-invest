import { useAuth } from '@/components/auth-provider'
import { Navigate, useLocation } from 'react-router'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    // Redirect to auth page with return url
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <>{children}</>
}