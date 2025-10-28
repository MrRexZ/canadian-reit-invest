import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useSolana } from '@/components/solana/use-solana'
import { PublicKey } from '@solana/web3.js'
import { fetchAllMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { Address } from 'gill'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { parse as uuidParse } from 'uuid'

export type ReitData = {
  id: string
  reit_name?: string
  fundraiser?: any
}

export function useReitsQuery() {
  const { client } = useSolana()

  return useQuery({
    queryKey: ['reits'],
    queryFn: async (): Promise<ReitData[]> => {
      const { data: reitsList, error: dbError } = await supabase.from('reits').select('*')
      if (dbError) throw new Error(dbError.message)

      if (!reitsList || reitsList.length === 0) {
        return []
      }

      // Step 1: Derive all fundraiser PDAs locally
      const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
      const pdaPairs = await Promise.all(
        reitsList.map(async (r: any) => {
          const id: string = r.id
          const reitName: string | undefined = r.reit_name
          const idBytes = uuidParse(id) as unknown as Uint8Array
          console.log(`=== REITS QUERY - PDA DERIVATION for ${reitName} ===`)
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

      return fetched
    },
    staleTime: 10000, // Consider data fresh for 10 seconds
    refetchInterval: 10000, // Auto-refetch every 10 seconds for multi-user sync
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  })
}
