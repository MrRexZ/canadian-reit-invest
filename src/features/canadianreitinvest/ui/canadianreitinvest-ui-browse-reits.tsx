import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSolana } from '@/components/solana/use-solana'
import { useWalletUi } from '@wallet-ui/react'
import { PublicKey } from '@solana/web3.js'
import { fetchAllMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { Address } from 'gill'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { useCreateReitMint } from '../hooks/use-create-reit-mint'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
  const { account } = useWalletUi()
  const createReitMintMutation = useCreateReitMint({ account: account! })
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ReitRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedReit, setSelectedReit] = useState<ReitRow | null>(null)
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [description, setDescription] = useState('')
  const [sharePrice, setSharePrice] = useState('')
  const [currency, setCurrency] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreateReitMint = () => {
    if (!selectedReit) return
    createReitMintMutation.mutate({
      reitId: selectedReit.id,
      name,
      symbol,
      description,
      sharePrice,
      currency,
    })
    setDialogOpen(false)
    setSelectedReit(null)
    setName('')
    setSymbol('')
    setDescription('')
    setSharePrice('')
    setCurrency('')
  }

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
            <TableHead>Actions</TableHead>
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
              <TableCell>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReit(row)
                        setName('')
                        setSymbol('')
                        setDescription('')
                        setSharePrice('')
                        setCurrency('')
                      }}
                    >
                      Create/Update Mint
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create/Update REIT Mint</DialogTitle>
                      <DialogDescription>
                        Enter the REIT mint token details. Only name and symbol are required to create the mint.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="col-span-3"
                          placeholder="e.g., My REIT Token"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="symbol" className="text-right">
                          Symbol
                        </Label>
                        <Input
                          id="symbol"
                          value={symbol}
                          onChange={(e) => setSymbol(e.target.value)}
                          className="col-span-3"
                          placeholder="e.g., MRT"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                          Description
                        </Label>
                        <Input
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="col-span-3"
                          placeholder="e.g., My REIT Description"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="share-price" className="text-right">
                          Share Price
                        </Label>
                        <Input
                          id="share-price"
                          type="number"
                          value={sharePrice}
                          onChange={(e) => setSharePrice(e.target.value)}
                          className="col-span-3"
                          placeholder="e.g., 100.00"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="currency" className="text-right">
                          Currency
                        </Label>
                        <Input
                          id="currency"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="col-span-3"
                          placeholder="e.g., CAD"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        onClick={handleCreateReitMint}
                        disabled={!name || !symbol || createReitMintMutation.isPending}
                      >
                        {createReitMintMutation.isPending ? 'Creating...' : 'Create REIT Mint'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
