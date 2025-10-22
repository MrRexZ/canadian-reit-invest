import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSolana } from '@/components/solana/use-solana'
import { PublicKey } from '@solana/web3.js'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { Address } from 'gill'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { parse as uuidParse } from 'uuid'

type ReitRow = {
  id: string
  reit_name?: string
  fundraiser?: any
}

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

        // For each reit row, derive fundraiser PDA and fetch fundraiser account + optional reit metadata
        const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
        const fetched: ReitRow[] = []

        for (const r of reits) {
          const id: string = r.id
          const reitName: string | undefined = r.reit_name
          // parse uuid to bytes
          const idBytes = uuidParse(id) as unknown as Uint8Array
          const [fundraiserPda] = await PublicKey.findProgramAddress([
            Buffer.from('fundraiser'),
            Buffer.from(idBytes),
          ], programId)

          let fundraiserAccount = null
          try {
            // fetch using client's rpc method
            // client.rpc is the function used by gill helpers; cast address to Address
            fundraiserAccount = await fetchMaybeFundraiser(client.rpc, fundraiserPda.toBase58() as unknown as Address)
          } catch (e) {
            // ignore missing fundraiser
            fundraiserAccount = null
          }

          fetched.push({ id, reit_name: reitName, fundraiser: fundraiserAccount })
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
      <h3 className="text-lg font-semibold mb-4">Browse REITs</h3>
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
              <TableCell className="text-right">{String(row.fundraiser?.data?.totalRaised ?? 0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
