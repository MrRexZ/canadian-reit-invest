import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserProfiles } from '@/lib/supabase-admin'
import { useSolana } from '@/components/solana/use-solana'
import { fetchAllMaybeInvestment } from '@/generated/accounts/investment'
import { Address } from 'gill'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useAuth } from '@/components/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type InvestmentRow = {
  id: string
  investment_pda: string
  investor_user_id: string
  reit_id?: string
  created_at: string
  investment?: any
  reit_name?: string
  user_name?: string
  user_email?: string
}

export default function BrowseInvestments({ isAdmin = false }: { isAdmin?: boolean }) {
  const { client } = useSolana()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<InvestmentRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Fetch investments based on role
        let query = supabase.from('investments').select('*')

        if (!isAdmin && user) {
          // Investors can only see their own investments
          query = query.eq('investor_user_id', user.id)
        }
        // Admins can see all investments (no filter needed)

        const { data: investments, error: dbError } = await query.order('created_at', { ascending: false })
        if (dbError) throw new Error(dbError.message)

        if (!investments || investments.length === 0) {
          if (mounted) setRows([])
          return
        }

        // Fetch REIT names for display
        const reitIds = [...new Set(investments.map(inv => inv.reit_id).filter(Boolean))]
        const { data: reits } = await supabase
          .from('reits')
          .select('id, reit_name')
          .in('id', reitIds)

        const reitMap = new Map(reits?.map(r => [r.id, r.reit_name]) || [])

        // Fetch user details for admin view
        let userMap = new Map<string, { name?: string; email?: string }>()
        if (isAdmin) {
          const investorUserIds = [...new Set(investments.map(inv => inv.investor_user_id))]
          const userProfiles = await getUserProfiles(investorUserIds)
          userMap = new Map(userProfiles.map(u => [u.id, { name: u.name, email: u.email }]))
        }

        // Step 1: Prepare investment PDA addresses
        const investmentAddresses = investments.map(inv => inv.investment_pda as unknown as Address)

        // Step 2: Batch fetch all investment accounts
        const chunkSize = 100
        const fetched: InvestmentRow[] = []

        for (let i = 0; i < investmentAddresses.length; i += chunkSize) {
          const chunk = investmentAddresses.slice(i, i + chunkSize)

          try {
            const accounts = await fetchAllMaybeInvestment(client.rpc, chunk)
            for (let j = 0; j < chunk.length; j++) {
              const investment = investments[i + j]
              const userInfo = userMap.get(investment.investor_user_id)
              fetched.push({
                ...investment,
                investment: accounts[j],
                reit_name: investment.reit_id ? reitMap.get(investment.reit_id) : undefined,
                user_name: userInfo?.name,
                user_email: userInfo?.email,
              })
            }
          } catch (e) {
            // If batch fails, add rows without investment data
            for (let j = 0; j < chunk.length; j++) {
              const investment = investments[i + j]
              const userInfo = userMap.get(investment.investor_user_id)
              fetched.push({
                ...investment,
                investment: null,
                reit_name: investment.reit_id ? reitMap.get(investment.reit_id) : undefined,
                user_name: userInfo?.name,
                user_email: userInfo?.email,
              })
            }
          }
        }

        if (mounted) setRows(fetched)
      } catch (err: any) {
        console.error('Failed to load investments', err)
        if (mounted) setError(err?.message ?? String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (user || isAdmin) {
      load()
    }
    return () => {
      mounted = false
    }
  }, [client, user, isAdmin])

  if (loading) return <span className="loading loading-spinner loading-md" />
  if (error) return <div className="text-red-600">Error: {error}</div>

  if (!loading && rows.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Browse Investments</h3>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {isAdmin ? 'No investments found.' : 'You have not made any investments yet.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Browse Investments</h3>
        <p className="text-muted-foreground">
          {isAdmin ? 'View all investments across the platform' : 'View your investment history'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Investments ({rows.length})</CardTitle>
          <CardDescription>
            {isAdmin ? 'All platform investments' : 'Your investment portfolio'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investment ID</TableHead>
                {isAdmin && <TableHead>Investor Name</TableHead>}
                {isAdmin && <TableHead>Investor Email</TableHead>}
                <TableHead>REIT</TableHead>
                <TableHead className="text-right">USDC Amount</TableHead>
                <TableHead className="text-right">REIT Tokens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const usdcAmount = row.investment?.data?.usdcAmount
                  ? Number(row.investment.data.usdcAmount) / 1_000_000 // Assuming 6 decimals
                  : 0
                const reitAmount = row.investment?.data?.reitAmount ?? 0
                const status = row.investment?.data?.status ?? 0

                // Status mapping (assuming 0=pending, 1=active, 2=completed, etc.)
                const statusLabels = ['Pending', 'Active', 'Completed', 'Cancelled']
                const statusLabel = statusLabels[status] || `Status ${status}`

                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.investment_pda.slice(0, 8)}...{row.investment_pda.slice(-8)}
                    </TableCell>
                    {isAdmin && <TableCell>{row.user_name || 'Unknown'}</TableCell>}
                    {isAdmin && <TableCell className="font-mono text-xs">{row.user_email || 'Unknown'}</TableCell>}
                    <TableCell>{row.reit_name || 'Unknown REIT'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${usdcAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {reitAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        status === 1 ? 'bg-green-100 text-green-800' :
                        status === 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {statusLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}