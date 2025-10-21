import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { CanadianreitinvestUiProgramExplorerLink } from './ui/canadianreitinvest-ui-program-explorer-link'
import { CanadianreitinvestUiProgram } from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-program'
import { CanadianreitinvestUiInitializeFundraiser } from './ui/canadianreitinvest-ui-initialize-fundraiser'
import { CanadianreitinvestUiCreateUsdcMint } from './ui/canadianreitinvest-ui-create-usdc-mint'

export default function CanadianreitinvestFeature() {
  const { account } = useSolana()

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
    <div>
      <AppHero title="Admin Fundraiser Dashboard" subtitle={'Admin Fundraiser Dashboard'}>
        <p className="mb-6">
          <CanadianreitinvestUiProgramExplorerLink />
        </p>
        <CanadianreitinvestUiCreateUsdcMint account={account} />
        <div className="mt-6">
          <CanadianreitinvestUiInitializeFundraiser account={account} />
        </div>
      </AppHero>
      <CanadianreitinvestUiProgram />
    </div>
  )
}
