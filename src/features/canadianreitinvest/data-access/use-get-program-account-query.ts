import { useSolana } from '@/components/solana/use-solana'
import { useQuery } from '@tanstack/react-query'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@project/anchor'

export function useGetProgramAccountQuery() {
  const { client, cluster } = useSolana()

  return useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => client.rpc.getAccountInfo(CANADIANREITINVEST_PROGRAM_ADDRESS).send(),
  })
}
