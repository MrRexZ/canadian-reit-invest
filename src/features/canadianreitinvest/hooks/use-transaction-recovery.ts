import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useSolana } from '@/components/solana/use-solana'
import type { Address } from 'gill'

export interface PendingTransactionStatus {
  signature: string
  status: 'pending' | 'finalized' | 'failed'
  lastChecked: number
}

/**
 * Hook to recover transaction status after page refresh
 * Checks the latest transaction for a given account (usually metadata PDA)
 * and recovers the pending state if the transaction hasn't finalized yet
 */
export function useTransactionRecovery(metadataPda: string | null) {
  const { client } = useSolana()
  const [pendingTx, setPendingTx] = useState<PendingTransactionStatus | null>(null)
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(false)

  const checkForPendingTransaction = async () => {
    if (!metadataPda || !client) return

    setIsCheckingRecovery(true)
    try {
      const rpc = client.rpc
      const metadataPubkey = new PublicKey(metadataPda)

      console.log('[TX RECOVERY] Checking for pending transactions on PDA:', metadataPda)

      // Fetch the most recent transaction for this account
      const signatures = await rpc
        .getSignaturesForAddress(metadataPda as Address, { limit: 1 })
        .send()

      if (!signatures || signatures.length === 0) {
        console.log('[TX RECOVERY] No recent transactions found for this PDA')
        setIsCheckingRecovery(false)
        return
      }

      const latestSig = signatures[0]
      console.log('[TX RECOVERY] Found latest signature:', latestSig.signature)
      console.log('[TX RECOVERY] Signature status:', latestSig.confirmationStatus)

      // Check the status of the latest transaction
      if (latestSig.confirmationStatus === 'finalized') {
        console.log('[TX RECOVERY] Latest transaction is finalized - no pending update')
        setPendingTx(null)
      } else if (latestSig.confirmationStatus === 'confirmed' || latestSig.confirmationStatus === 'processed') {
        console.log('[TX RECOVERY] Found pending transaction:', latestSig.signature)
        setPendingTx({
          signature: latestSig.signature,
          status: 'pending',
          lastChecked: Date.now(),
        })
      } else if (latestSig.err) {
        console.log('[TX RECOVERY] Latest transaction failed:', latestSig.err)
        setPendingTx({
          signature: latestSig.signature,
          status: 'failed',
          lastChecked: Date.now(),
        })
      }
    } catch (error) {
      console.error('[TX RECOVERY] Error checking for pending transactions:', error)
    } finally {
      setIsCheckingRecovery(false)
    }
  }

  useEffect(() => {
    if (!metadataPda || !client) return
    checkForPendingTransaction()
  }, [metadataPda, client])

  return {
    pendingTx,
    isCheckingRecovery,
    clearPendingTx: () => setPendingTx(null),
    checkNow: checkForPendingTransaction,
  }
}
