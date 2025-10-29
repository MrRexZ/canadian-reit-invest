import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSolana } from '@/components/solana/use-solana'
import { useWalletUi } from '@wallet-ui/react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fetchMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { publicKey } from '@metaplex-foundation/umi'
import { fetchAllMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { fetchAllMaybeInvestment } from '@/generated/accounts/investment'
import { Address } from 'gill'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { useCreateReitMint } from '../hooks/use-create-reit-mint'
import { useUpdateReitMint, useUpdateReitMintRecovery } from '../hooks/use-update-reit-mint'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { parse as uuidParse } from 'uuid'
import { getMetadataPdaForMint } from '@/lib/metaplex-update'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58()

type ReitRow = {
  id: string
  reit_name?: string
  fundraiserAddress: string
  fundraiser?: any
}

/**
 * Admin version of Browse REITs
 * Shows table with REIT details and admin controls
 */
export default function CanadianreitinvestUiBrowseReits() {
  const { client, cluster } = useSolana()
  const { account } = useWalletUi()
  const queryClient = useQueryClient()
  
  const [selectedReit, setSelectedReit] = useState<ReitRow | null>(null)
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [description, setDescription] = useState('')
  const [sharePrice, setSharePrice] = useState('')
  const [currency, setCurrency] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [selectedMetadataPda, setSelectedMetadataPda] = useState<string | null>(null)
  
  // React Query hook to fetch REITs data
  const { data: rows = [], isLoading: loading, error } = useQuery({
    queryKey: ['browse-reits', cluster.id],
    queryFn: async () => {
      const { data: reits, error: dbError } = await supabase.from('reits').select('*')
      if (dbError) throw new Error(dbError.message)

      if (!reits || reits.length === 0) {
        return []
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
              fundraiserAddress: chunk[j].fundraiserAddress,
              fundraiser: accounts[j],
            })
          }
        } catch (e) {
          // If batch fails, add rows without fundraiser data
          for (const pair of chunk) {
            fetched.push({
              id: pair.id,
              reit_name: pair.reit_name,
              fundraiserAddress: pair.fundraiserAddress,
              fundraiser: null,
            })
          }
        }
      }

      return fetched
    },
    staleTime: 10000, // Consider data fresh for 10 seconds
    refetchOnWindowFocus: true,
  })

  // Separate query for total raised amounts
  const { data: totalRaisedByReit = new Map() } = useQuery({
    queryKey: ['browse-reits-totals', cluster.id, rows.map(r => r.id).join(',')],
    queryFn: async () => {
      if (rows.length === 0) return new Map<string, number>()

      const reitIds = rows.map(row => row.id)
      const { data: allInvestments } = await supabase
        .from('investments')
        .select('reit_id, investment_pda')
        .in('reit_id', reitIds)

      const totalsMap = new Map<string, number>()

      if (allInvestments) {
        // Group investments by REIT
        const investmentsByReit = allInvestments.reduce((acc, inv) => {
          if (!acc[inv.reit_id]) acc[inv.reit_id] = []
          acc[inv.reit_id].push(inv)
          return acc
        }, {} as Record<string, typeof allInvestments>)

        // For each REIT, fetch investment accounts and calculate total
        for (const reitId of reitIds) {
          const reitInvestments = investmentsByReit[reitId] || []
          if (reitInvestments.length === 0) {
            totalsMap.set(reitId, 0)
            continue
          }

          // Fetch investment accounts
          const investmentAddresses = reitInvestments.map(inv => inv.investment_pda as unknown as Address)
          try {
            const investmentAccounts = await fetchAllMaybeInvestment(client.rpc, investmentAddresses)
            
            // Sum up USDC amounts for non-refunded investments
            let totalRaised = 0
            for (const account of investmentAccounts) {
              if (account.exists && account.data) {
                // Status 2 = Refunded, so exclude those
                if (account.data.status !== 2) {
                  totalRaised += Number(account.data.usdcAmount || 0)
                }
              }
            }
            
            totalsMap.set(reitId, totalRaised)
          } catch (error) {
            console.warn(`Failed to fetch investments for REIT ${reitId}:`, error)
            totalsMap.set(reitId, 0)
          }
        }
      }

      return totalsMap
    },
    enabled: rows.length > 0,
    staleTime: 10000,
  })
  
  const createReitMintMutation = useCreateReitMint({ 
    account: account!,
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['browse-reits'] })
    }
  })
  
  const updateReitMintMutation = useUpdateReitMint({ 
    account: account!,
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['browse-reits'] })
    }
  })
  
  // const [recoveryTrigger, setRecoveryTrigger] = useState(0)
  const { pendingTx, isCheckingRecovery, clearPendingTx, checkNow } = useUpdateReitMintRecovery(
    dialogOpen && selectedMetadataPda ? selectedMetadataPda : null
  )
  const fetchTokenMetadata = async (mintAddress: string) => {
    try {
      setLoadingMetadata(true)
      
      // Create UMI instance with the current RPC endpoint
      // Map cluster ID to RPC endpoint
      const getRpcEndpoint = (clusterId: string) => {
        switch (clusterId) {
          case 'solana:mainnet':
            return 'https://api.mainnet-beta.solana.com'
          case 'solana:devnet':
            return 'https://api.devnet.solana.com'
          case 'solana:testnet':
            return 'https://api.testnet.solana.com'
          case 'solana:localnet':
          default:
            return 'http://localhost:8899'
        }
      }
      const rpcEndpoint = getRpcEndpoint(cluster.id)
      console.log('[METADATA FETCH] Cluster ID:', cluster.id, 'RPC Endpoint:', rpcEndpoint)
      const umi = createUmi(rpcEndpoint)
      
      // Derive metadata account address
      const [metadataPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          new PublicKey(mintAddress).toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      )
      
      // Fetch metadata
      const metadata = await fetchMetadata(umi, publicKey(metadataPda.toString()))
      
      if (metadata) {
        // Parse the metadata JSON from URI
        const response = await fetch(metadata.uri)
        const metadataJson = await response.json()
        
        // Extract values from metadata
        setName(metadataJson.name || '')
        setSymbol(metadataJson.symbol || '')
        setDescription(metadataJson.description || '')
        
        // Extract share price and currency from attributes
        const sharePriceAttr = metadataJson.attributes?.find((attr: any) => attr.trait_type === 'share_price')
        const currencyAttr = metadataJson.attributes?.find((attr: any) => attr.trait_type === 'currency')
        
        setSharePrice(sharePriceAttr?.value || '')
        setCurrency(currencyAttr?.value || '')
      }
    } catch (error) {
      console.error('Failed to fetch token metadata:', error)
      // Reset form if metadata fetch fails
      setName('')
      setSymbol('')
      setDescription('')
      setSharePrice('')
      setCurrency('')
    } finally {
      setLoadingMetadata(false)
    }
  }

  const handleCreateOrUpdateReitMint = () => {
    if (!selectedReit) return
    
    const isUpdate = selectedReit?.fundraiser?.data?.reitMint && 
                     selectedReit.fundraiser.data.reitMint !== SYSTEM_PROGRAM_ID
    
    if (isUpdate) {
      // Use update mutation for existing mint
      updateReitMintMutation.mutate({
        reitId: selectedReit.id,
        mintAddress: selectedReit.fundraiser.data.reitMint,
        name,
        symbol,
        description,
        sharePrice,
        currency,
      })
    } else {
      // Use create mutation for new mint
      createReitMintMutation.mutate({
        reitId: selectedReit.id,
        name,
        symbol,
        description,
        sharePrice,
        currency,
      })
    }
    
    setDialogOpen(false)
    setSelectedReit(null)
    setSelectedMetadataPda(null)
    setName('')
    setSymbol('')
    setDescription('')
    setSharePrice('')
    setCurrency('')
  }

  if (loading) return <span className="loading loading-spinner loading-md" />
  if (error) return <div className="text-red-600">Error: {error instanceof Error ? error.message : String(error)}</div>

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
            <TableHead>Fundraiser PDA ID</TableHead>
            <TableHead>REIT Name</TableHead>
            <TableHead className="text-right">Total Raised (USDC)</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono">{row.fundraiserAddress}</TableCell>
              <TableCell>{row.reit_name ?? '-'}</TableCell>
              <TableCell className="text-right">
                ${((totalRaisedByReit.get(row.id) || 0) / 1_000_000).toFixed(2)}
              </TableCell>
              <TableCell>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open)
                // Clear recovery state when dialog closes
                if (!open) {
                  setSelectedMetadataPda(null)
                  clearPendingTx?.()
                }
              }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setSelectedReit(row)
                        
                        // Check if this is an update operation
                        const isUpdate = row.fundraiser?.data?.reitMint && 
                                        row.fundraiser.data.reitMint !== SYSTEM_PROGRAM_ID
                        
                        if (isUpdate && row.fundraiser?.data?.reitMint) {
                          // Get metadata PDA for recovery
                          const metadataPda = await getMetadataPdaForMint(row.fundraiser.data.reitMint)
                          setSelectedMetadataPda(metadataPda)
                          console.log('[BROWSE REITS] Stored metadata PDA for recovery:', metadataPda)
                          
                          // Trigger recovery check
                          setTimeout(() => {
                            checkNow?.()
                          }, 0)
                          
                          // Fetch existing metadata for update
                          await fetchTokenMetadata(row.fundraiser.data.reitMint)
                        } else {
                          // Reset form for create
                          setSelectedMetadataPda(null)
                          setName('')
                          setSymbol('')
                          setDescription('')
                          setSharePrice('')
                          setCurrency('')
                        }
                      }}
                    >
                      {row.fundraiser?.data?.reitMint && 
                       row.fundraiser.data.reitMint !== SYSTEM_PROGRAM_ID 
                        ? 'Update Mint' 
                        : 'Create Mint'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedReit?.fundraiser?.data?.reitMint && 
                         selectedReit.fundraiser.data.reitMint !== SYSTEM_PROGRAM_ID 
                          ? 'Update REIT Mint' 
                          : 'Create REIT Mint'}
                      </DialogTitle>
                      <DialogDescription>
                        {selectedReit?.fundraiser?.data?.reitMint && 
                         selectedReit.fundraiser.data.reitMint !== SYSTEM_PROGRAM_ID 
                          ? 'Update the REIT mint token details.' 
                          : 'Enter the REIT mint token details. Only name and symbol are required to create the mint.'}
                      </DialogDescription>
                    </DialogHeader>
                    {loadingMetadata ? (
                      <div className="flex items-center justify-center py-8">
                        <span className="loading loading-spinner loading-md mr-2" />
                        Loading existing metadata...
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 py-4">
                          {isCheckingRecovery && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <p className="text-sm text-blue-800">Checking for pending updates...</p>
                            </div>
                          )}

                          {pendingTx && pendingTx.status === 'pending' && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="font-semibold text-sm text-yellow-900">⏳ Update Pending</p>
                              <p className="text-xs text-yellow-800 mt-1">
                                An update for this REIT is currently being processed on-chain. 
                                Please wait for it to finalize before making another update.
                              </p>
                              <p className="text-xs text-yellow-700 mt-1">
                                Signature: {pendingTx.signature.slice(0, 20)}...
                              </p>
                            </div>
                          )}

                          {pendingTx && pendingTx.status === 'failed' && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                              <p className="font-semibold text-sm text-red-900">❌ Update Failed</p>
                              <p className="text-xs text-red-800 mt-1">
                                The previous update for this REIT failed. You can try again now.
                              </p>
                            </div>
                          )}
                          
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
                            onClick={handleCreateOrUpdateReitMint}
                            disabled={
                              !name || 
                              !symbol || 
                              createReitMintMutation.isPending || 
                              updateReitMintMutation.isPending || 
                              loadingMetadata ||
                              isCheckingRecovery ||
                              (pendingTx?.status === 'pending')
                            }
                            title={
                              pendingTx?.status === 'pending'
                                ? 'Waiting for pending update to finalize before you can make another update'
                                : ''
                            }
                          >
                            {createReitMintMutation.isPending || updateReitMintMutation.isPending
                              ? (selectedReit?.fundraiser?.data?.reitMint && 
                                 selectedReit.fundraiser.data.reitMint !== SYSTEM_PROGRAM_ID 
                                  ? 'Updating...' 
                                  : 'Creating...')
                              : (selectedReit?.fundraiser?.data?.reitMint && 
                                 selectedReit.fundraiser.data.reitMint !== SYSTEM_PROGRAM_ID 
                                  ? 'Update REIT Mint' 
                                  : 'Create REIT Mint')}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
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
