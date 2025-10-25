import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSolana } from '@/components/solana/use-solana'
import { PublicKey } from '@solana/web3.js'
import { fetchAllMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { Address } from 'gill'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { parse as uuidParse } from 'uuid'

type ReitRow = {
  id: string
  reit_name?: string
  fundraiser?: any
}

/**
 * Admin version of Browse REITs
 * Shows table with REIT details and admin controls
 */
export default function CanadianreitinvestUiBrowseReits() {
  const { client, cluster } = useSolana()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ReitRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: reits, error: dbError } = await supabase.from('reits').select('*')
        if (dbError) throw new Error(dbError.message)

        if (!reits || reits.length === 0) {
          if (mounted) setRows([])
          return
        }

        // Step 1: Derive all fundraiser PDAs locally
        const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
        const pdaPairs = await Promise.all(
          reits.map(async (r: any) => {
            const id: string = r.id
            const reitName: string | undefined = r.reit_name
            const idBytes = uuidParse(id) as unknown as Uint8Array
            const [fundraiserPda] = await PublicKey.findProgramAddress(
              [Buffer.from('fundraiser'), Buffer.from(idBytes)],
              programId
            )
            return {
              id,
              reit_name: reitName,
              fundraiserAddress: fundraiserPda.toBase58() as unknown as Address,
            }
          })
        )

        // Step 2: Batch fetch all fundraiser accounts
        const chunkSize = 100
        const fetched: ReitRow[] = []

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

        if (mounted) setRows(fetched)
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

  if (loading) return <span className="loading loading-spinner loading-md" />
  if (error) return <div className="text-red-600">Error: {error}</div>

  if (!loading && rows.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Browse REITs</h3>
        <div className="p-6 border rounded-md text-muted-foreground">No REITs found. Initialize a REIT from the Create REIT tab to see it listed here.</div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Browse REITs (Admin)</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>REIT ID</TableHead>
            <TableHead>REIT Name</TableHead>
            <TableHead className="text-right">Total Raised (USDC)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono">{row.id}</TableCell>
              <TableCell>{row.reit_name ?? '-'}</TableCell>
              <TableCell className="text-right">
                ${((row.fundraiser?.data?.totalRaised !== undefined
                  ? Number(row.fundraiser.data.totalRaised)
                  : 0) / 1_000_000).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
