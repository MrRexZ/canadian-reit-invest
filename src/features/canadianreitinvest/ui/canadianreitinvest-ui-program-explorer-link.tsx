import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@project/anchor'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { ellipsify } from '@wallet-ui/react'

export function CanadianreitinvestUiProgramExplorerLink() {
  return <AppExplorerLink address={CANADIANREITINVEST_PROGRAM_ADDRESS} label={ellipsify(CANADIANREITINVEST_PROGRAM_ADDRESS)} />
}
