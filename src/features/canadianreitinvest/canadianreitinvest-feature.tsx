import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { CanadianreitinvestUiProgramExplorerLink } from './ui/canadianreitinvest-ui-program-explorer-link'
import { CanadianreitinvestUiCreate } from './ui/canadianreitinvest-ui-create'
import { CanadianreitinvestUiProgram } from '@/features/canadianreitinvest/ui/canadianreitinvest-ui-program'

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
      <AppHero title="Canadianreitinvest" subtitle={'Run the program by clicking the "Run program" button.'}>
        <p className="mb-6">
          <CanadianreitinvestUiProgramExplorerLink />
        </p>
        <CanadianreitinvestUiCreate account={account} />
      </AppHero>
      <CanadianreitinvestUiProgram />
    </div>
  )
}
