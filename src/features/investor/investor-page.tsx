import { useAuth } from '@/components/auth-provider'
import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import BrowseReitsInvestor from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-browse-reits-investor'
import { useInitializeInvestor } from '@/features/canadianreitinvest/hooks/use-initialize-investor'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { PublicKey } from '@solana/web3.js'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { fetchMaybeInvestor } from '@/generated/accounts/investor'
import { Address } from 'gill'

export default function InvestorPage() {
  const { user } = useAuth()
  const { account, client } = useSolana()
  const initializeInvestor = useInitializeInvestor({ account: account! })
  const [investorPdaExists, setInvestorPdaExists] = useState<boolean | null>(null)

  // Check if investor PDA already exists
  useEffect(() => {
    if (!account?.publicKey || !client) return

    const checkInvestorPda = async () => {
      try {
        const programId = new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
        const investorPubkey = new PublicKey(account.publicKey)

        const [investorPda] = await PublicKey.findProgramAddress(
          [Buffer.from('investor'), investorPubkey.toBuffer()],
          programId
        )

        const investorAccount = await fetchMaybeInvestor(
          client.rpc,
          investorPda.toBase58() as Address
        )

        setInvestorPdaExists(investorAccount?.exists ?? false)
      } catch (err) {
        console.error('Failed to check investor PDA:', err)
        setInvestorPdaExists(false)
      }
    }

    checkInvestorPda()
  }, [account, client])

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="hero py-[64px]">
          <div className="hero-content text-center">
            <WalletDropdown />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="pb-4 mb-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Investor Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              {user?.email ? `Welcome, ${user.email}` : 'Welcome to your investment dashboard'}
            </p>
          </div>
          {investorPdaExists === false && (
            <Button
              onClick={() => initializeInvestor.mutate()}
              disabled={initializeInvestor.isPending}
              variant="outline"
            >
              {initializeInvestor.isPending ? 'Initializing...' : 'Setup Investor Account'}
            </Button>
          )}
        </div>
      </div>

      <BrowseReitsInvestor account={account} />
    </div>
  )
}
