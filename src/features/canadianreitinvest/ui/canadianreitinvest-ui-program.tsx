import { useGetProgramAccountQuery } from '@/features/canadianreitinvest/data-access/use-get-program-account-query'

import { AppAlert } from '@/components/app-alert'
import { useSolana } from '@/components/solana/use-solana'
import { useState } from 'react'
import BrowseReits from './canadianreitinvest-ui-browse-reits'

export function CanadianreitinvestUiProgram() {
  const { cluster } = useSolana()
  const query = useGetProgramAccountQuery()
  const [tab, setTab] = useState<'program' | 'browse'>('program')

  return (
    <div className={'space-y-6'}>
      <div className="p-2 border rounded-md bg-base-100">
        <div className="flex gap-2">
          <button className={`btn btn-sm ${tab === 'program' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('program')}>Program Account</button>
          <button className={`btn btn-sm ${tab === 'browse' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('browse')}>Browse REITs</button>
        </div>
      </div>

      <div className="mt-4">
        {tab === 'program' ? (
          query.isLoading ? (
            <span className="loading loading-spinner loading-lg" />
          ) : !query.data?.value ? (
            <AppAlert>Program account not found on {cluster.label}. Be sure to deploy your program and try again.</AppAlert>
          ) : (
            <pre>{JSON.stringify(query.data.value.data, null, 2)}</pre>
          )
        ) : (
          <BrowseReits />
        )}
      </div>
    </div>
  )
}
