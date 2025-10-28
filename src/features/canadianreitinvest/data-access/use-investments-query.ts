import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getUserProfiles } from '@/lib/supabase-admin'
import { useSolana } from '@/components/solana/use-solana'
import { fetchAllMaybeInvestment } from '@/generated/accounts/investment'
import { Address } from 'gill'

export type InvestmentRow = {
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

interface UseInvestmentsQueryOptions {
  isAdmin: boolean
  userId?: string
}

export function useInvestmentsQuery({ isAdmin, userId }: UseInvestmentsQueryOptions) {
  const { client } = useSolana()

  return useQuery({
    queryKey: ['investments', { isAdmin, userId }],
    queryFn: async (): Promise<InvestmentRow[]> => {
      // Fetch investments based on role
      let query = supabase.from('investments').select('*')

      if (!isAdmin && userId) {
        // Investors can only see their own investments
        query = query.eq('investor_user_id', userId)
      }
      // Admins can see all investments (no filter needed)

      const { data: investments, error: dbError } = await query.order('created_at', { ascending: false })
      if (dbError) throw new Error(dbError.message)

      if (!investments || investments.length === 0) {
        return []
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

      return fetched
    },
    staleTime: 10000, // Consider data fresh for 10 seconds
    refetchInterval: 10000, // Auto-refetch every 10 seconds for multi-user sync
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    enabled: isAdmin || !!userId, // Only fetch if conditions are met
  })
}
