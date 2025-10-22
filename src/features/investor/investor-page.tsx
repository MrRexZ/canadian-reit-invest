import { useAuth } from '@/components/auth-provider'

export default function InvestorPage() {
  const { user } = useAuth()

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Investor Dashboard</h1>
        <p className="text-muted-foreground mt-3 text-base">
          {user?.email ? `Welcome, ${user.email}` : 'Welcome to your investment dashboard'}
        </p>
      </div>

      <p>Investor dashboard content goes here.</p>
    </div>
  )
}
