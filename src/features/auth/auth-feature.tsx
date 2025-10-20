import { useState } from 'react'
import { AuthLogin } from '@/components/auth-login'
import { AuthSignup } from '@/components/auth-signup'

export default function AuthFeature() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {isLogin ? (
          <AuthLogin onSwitchToSignup={() => setIsLogin(false)} />
        ) : (
          <AuthSignup onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  )
}