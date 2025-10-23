import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { UiWalletAccount } from '@wallet-ui/react'
import { CanadianreitinvestUiInvest } from './canadianreitinvest-ui-invest'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useSolana } from '@/components/solana/use-solana'
import { PublicKey } from '@solana/web3.js'
import { fetchAllMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { Address } from 'gill'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { parse as uuidParse } from 'uuid'

type ReitData = {
  id: string
  reit_name?: string
  fundraiser?: any
}

export default function BrowseReitsInvestor({ account }: { account: UiWalletAccount }) {
  const { client, cluster } = useSolana()
  const [loading, setLoading] = useState(false)
  const [reits, setReits] = useState<ReitData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedReit, setSelectedReit] = useState<ReitData | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: reitsList, error: dbError } = await supabase.from('reits').select('*')
        if (dbError) throw new Error(dbError.message)

        if (!reitsList || reitsList.length === 0) {
          if (mounted) setReits([])
          return
        }

        // Step 1: Derive all fundraiser PDAs locally
        const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
        const pdaPairs = await Promise.all(
          reitsList.map(async (r: any) => {
            const id: string = r.id
            const reitName: string | undefined = r.reit_name
            const idBytes = uuidParse(id) as unknown as Uint8Array
            console.log(`=== BROWSE REITS - PDA DERIVATION for ${reitName} ===`)
            console.log('REIT ID (UUID):', id)
            console.log('idBytes (hex):', Buffer.from(idBytes).toString('hex'))
            const [fundraiserPda] = await PublicKey.findProgramAddress(
              [Buffer.from('fundraiser'), Buffer.from(idBytes)],
              programId
            )
            console.log('Derived fundraiserPda:', fundraiserPda.toBase58())
            return {
              id,
              reit_name: reitName,
              fundraiserAddress: fundraiserPda.toBase58() as unknown as Address,
            }
          })
        )

        // Step 2: Batch fetch all fundraiser accounts
        const chunkSize = 100
        const fetched: ReitData[] = []

        for (let i = 0; i < pdaPairs.length; i += chunkSize) {
          const chunk = pdaPairs.slice(i, i + chunkSize)
          const addresses = chunk.map((p) => p.fundraiserAddress)

          try {
            const accounts = await fetchAllMaybeFundraiser(client.rpc, addresses)
            for (let j = 0; j < chunk.length; j++) {
              fetched.push({
                id: chunk[j].id,
                reit_name: chunk[j].reit_name,
                fundraiser: accounts[j],
              })
            }
          } catch (e) {
            // If batch fails, add rows without fundraiser data
            for (const pair of chunk) {
              fetched.push({
                id: pair.id,
                reit_name: pair.reit_name,
                fundraiser: null,
              })
            }
          }
        }

        if (mounted) setReits(fetched)
      } catch (err: any) {
        console.error('Failed to load REITs', err)
        if (mounted) setError(err?.message ?? String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [client, cluster])

  const handleCloseInvestModal = () => {
    setSelectedReit(null)
  }

  if (loading) return <span className="loading loading-spinner loading-md" />
  if (error) return <div className="text-red-600">Error: {error}</div>

  if (!loading && reits.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-2">Available REITs</h2>
        <div className="p-6 border rounded-md text-muted-foreground">
          No REITs available at this time. Check back soon!
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Available REITs</h2>
        <p className="text-muted-foreground">Click on any REIT to invest</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reits.map((reit) => {
          const totalRaisedBigInt = reit.fundraiser?.data?.totalRaised ?? 0n
          const totalRaised = typeof totalRaisedBigInt === 'bigint' ? Number(totalRaisedBigInt) : totalRaisedBigInt
          const targetAmount = 2000000 // TODO: add to fundraiser PDA or supabase
          const progressPercent = targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0
          const remaining = Math.max(0, targetAmount - totalRaised)

          return (
            <div
              key={reit.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedReit(reit)}
            >
              <h3 className="text-lg font-semibold mb-2">{reit.reit_name || 'Unnamed REIT'}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Investment opportunity in {reit.reit_name || 'this REIT'}
              </p>

              <div className="space-y-3">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Progress</span>
                    <span className="text-muted-foreground">
                      {progressPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Amount Info */}
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Raised:</span>
                    <span className="font-medium">
                      ${(totalRaised / 1000000).toFixed(2)}M
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <span className="font-medium">
                      ${(targetAmount / 1000000).toFixed(2)}M
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground mt-1">
                    <span>Remaining:</span>
                    <span>${(remaining / 1000000).toFixed(2)}M</span>
                  </div>
                </div>

                {/* Invest Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedReit(reit)
                  }}
                  className="w-full"
                >
                  Invest
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Invest Modal Dialog */}
      <Dialog open={selectedReit !== null} onOpenChange={(open) => !open && handleCloseInvestModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedReit ? `Invest in ${selectedReit.reit_name}` : 'Invest'}</DialogTitle>
          </DialogHeader>

          {selectedReit && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Fund Details</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="font-medium">{selectedReit.reit_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Raised:</span>
                    <span className="font-medium">
                      ${((selectedReit.fundraiser?.data?.totalRaised !== undefined 
                        ? Number(selectedReit.fundraiser.data.totalRaised) 
                        : 0) / 1000000).toFixed(2)}M USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Investments:</span>
                    <span className="font-medium">
                      {selectedReit.fundraiser?.data?.investment_counter ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invest Form */}
              <CanadianreitinvestUiInvest
                account={account}
                reitId={selectedReit.id}
                onSuccess={handleCloseInvestModal}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
