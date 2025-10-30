import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import type { Address } from 'gill'

export interface PendingTransactionStatus {
  signature: string
  status: 'pending' | 'finalized' | 'failed'
  lastChecked: number
}

/**
 * Hook to recover and monitor transaction status
 * Uses React Query to automatically poll for transaction status updates
 * Polls every 2 seconds when a transaction is pending, stops when finalized/failed
 */
export function useTransactionRecovery(metadataPda: string | null) {
  const { client } = useSolana()
  const queryClient = useQueryClient()

  const { data: pendingTx, isLoading: isCheckingRecovery } = useQuery({
    queryKey: ['transaction-recovery', metadataPda],
    queryFn: async (): Promise<PendingTransactionStatus | null> => {
      if (!metadataPda || !client) return null

      try {
        const rpc = client.rpc

        console.log('[TX RECOVERY] Checking for pending transactions on PDA:', metadataPda)

        // Fetch the most recent transaction for this account
        const signatures = await rpc
          .getSignaturesForAddress(metadataPda as Address, { limit: 1 })
          .send()

        if (!signatures || signatures.length === 0) {
          console.log('[TX RECOVERY] No recent transactions found for this PDA')
          return null
        }

        const latestSig = signatures[0]
        console.log('[TX RECOVERY] Found latest signature:', latestSig.signature)
        console.log('[TX RECOVERY] Signature status:', latestSig.confirmationStatus)

        // Check the status of the latest transaction
        if (latestSig.confirmationStatus === 'finalized') {
          console.log('[TX RECOVERY] Latest transaction is finalized - no pending update')
          return null
        } else if (latestSig.confirmationStatus === 'confirmed' || latestSig.confirmationStatus === 'processed') {
          console.log('[TX RECOVERY] Found pending transaction:', latestSig.signature)
          return {
            signature: latestSig.signature,
            status: 'pending',
            lastChecked: Date.now(),
          }
        } else if (latestSig.err) {
          console.log('[TX RECOVERY] Latest transaction failed:', latestSig.err)
          return {
            signature: latestSig.signature,
            status: 'failed',
            lastChecked: Date.now(),
          }
        }

        return null
      } catch (error) {
        console.error('[TX RECOVERY] Error checking for pending transactions:', error)
        return null
      }
    },
    enabled: !!metadataPda && !!client,
    // Poll every 2 seconds when there's a pending transaction
    refetchInterval: (query) => {
      const data = query.state.data
      // Keep polling if status is pending, stop if finalized/failed/null
      return data?.status === 'pending' ? 2000 : false
    },
    // Always refetch on mount to get latest status
    staleTime: 0,
  })

  const checkNow = () => {
    queryClient.invalidateQueries({ queryKey: ['transaction-recovery', metadataPda] })
  }

  const clearPendingTx = () => {
    queryClient.setQueryData(['transaction-recovery', metadataPda], null)
  }

  return {
    pendingTx: pendingTx ?? null,
    isCheckingRecovery,
    clearPendingTx,
    checkNow,
  }
}
