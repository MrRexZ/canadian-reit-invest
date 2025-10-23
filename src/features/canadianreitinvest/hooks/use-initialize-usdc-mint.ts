import { useSolana } from '@/components/solana/use-solana'
import { PublicKey } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'
import { useQuery } from '@tanstack/react-query'
import { LOCALNET_USDC_MINT_ADDRESS } from '@/lib/usdc-mint-address'

export { LOCALNET_USDC_MINT_ADDRESS }

/**
 * Hook to check if USDC mint is initialized on localnet
 */
export function useCheckUsdcMint() {
  const { client } = useSolana()

  return useQuery({
    queryKey: ['usdc-mint-status'],
    queryFn: async () => {
      if (!client) {
        return { exists: false, message: 'Solana client not available' }
      }

      try {
        const mintAddress = new PublicKey(LOCALNET_USDC_MINT_ADDRESS)
        const mint = await getMint(client.rpc as any, mintAddress)
        return {
          exists: true,
          mint: {
            address: mintAddress.toBase58(),
            decimals: mint.decimals,
            supply: mint.supply.toString(),
          },
        }
      } catch (error) {
        return { exists: false, message: 'USDC mint not found. Run the setup script.' }
      }
    },
    refetchInterval: 5000, // Check every 5 seconds
  })
}
