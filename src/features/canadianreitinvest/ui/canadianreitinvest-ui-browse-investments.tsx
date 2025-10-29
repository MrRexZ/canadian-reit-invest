import { InvestmentStatus } from '@/generated/types/investmentStatus'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppModal } from '@/components/app-modal'
import { useRelease } from '../hooks/use-release'
import { useRefund } from '../hooks/use-refund'
import { useWire } from '../hooks/use-wire'
import { useIssueShare } from '../hooks/use-issue-share'
import { PublicKey } from '@solana/web3.js'
import { parse as uuidParse } from 'uuid'
import { CANADIANREITINVEST_PROGRAM_ADDRESS } from '@/generated/programs/canadianreitinvest'
import { useSolana } from '@/components/solana/use-solana'
import { fetchMaybeFundraiser } from '@/generated/accounts/fundraiser'
import { useInvestmentsQuery } from '../data-access/use-investments-query'
import { Address } from 'gill'
import { getSolanaExplorerUrl } from '@/lib/cluster-endpoints'
import { ExternalLink } from 'lucide-react'

export default function BrowseInvestments({ isAdmin = false, userId }: { isAdmin?: boolean; userId?: string }) {
  const { client, cluster } = useSolana()
  const { account } = useSolana()
  
  // Use React Query hook for data fetching and automatic polling/invalidation
  const { data: rows = [], isLoading, error } = useInvestmentsQuery({ isAdmin, userId })
  
  const releaseMutation = useRelease({ account: account! })
  const refundMutation = useRefund({ account: account! })
  const wireMutation = useWire({ account: account! })
  const issueShareMutation = useIssueShare({ account: account! })

  if (isLoading) return <span className="loading loading-spinner loading-md" />
  if (error) return <div className="text-red-600">Error: {error instanceof Error ? error.message : String(error)}</div>

  if (!isLoading && rows.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Browse Investments</h3>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {isAdmin ? 'No investments found.' : 'You have not made any investments yet.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Browse Investments</h3>
        <p className="text-muted-foreground">
          {isAdmin ? 'View all investments across the platform' : 'View your investment history'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Investments ({rows.length})</CardTitle>
          <CardDescription>
            {isAdmin ? 'All platform investments' : 'Your investment portfolio'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && <TableHead>Investment ID</TableHead>}
                {isAdmin && <TableHead>Investor Name</TableHead>}
                {isAdmin && <TableHead>Investor Email</TableHead>}
                <TableHead>REIT</TableHead>
                <TableHead className="text-right">USDC Amount</TableHead>
                <TableHead className="text-right">REIT Tokens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const usdcAmount = row.investment?.data?.usdcAmount
                  ? Number(row.investment.data.usdcAmount) / 1_000_000 // Assuming 6 decimals
                  : 0
                const reitAmount = row.investment?.data?.reitAmount ?? 0
                const status = row.investment?.data?.status ?? 0

                // Status mapping based on InvestmentStatus enum
                const statusLabels = ['Pending', 'Released', 'Refunded', 'Wired', 'Share Issued', 'Share Sold']
                const statusLabel = statusLabels[status] || `Unknown Status ${status}`

                return (
                  <TableRow key={row.id}>
                    {isAdmin && (
                      <TableCell className="font-mono text-xs">
                        <a
                          href={getSolanaExplorerUrl(row.investment_pda, cluster.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                        >
                          {row.investment_pda}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                    )}
                    {isAdmin && <TableCell>{row.user_name || 'Unknown'}</TableCell>}
                    {isAdmin && <TableCell className="font-mono text-xs">{row.user_email || 'Unknown'}</TableCell>}
                    <TableCell>{row.reit_name || 'Unknown REIT'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${usdcAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {reitAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        status === InvestmentStatus.Pending ? 'bg-yellow-100 text-yellow-800' :
                        status === InvestmentStatus.Released ? 'bg-blue-100 text-blue-800' :
                        status === InvestmentStatus.Refunded ? 'bg-red-100 text-red-800' :
                        status === InvestmentStatus.Wired ? 'bg-orange-100 text-orange-800' :
                        status === InvestmentStatus.ShareIssued ? 'bg-green-100 text-green-800' :
                        status === InvestmentStatus.ShareSold ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {statusLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {status === InvestmentStatus.Pending && row.reit_id && (
                          <AppModal
                            title="Release Investment"
                            submitLabel="Release"
                            submit={() => releaseMutation.mutate({
                              investmentPda: row.investment_pda,
                              reitId: row.reit_id!,
                            })}
                            submitDisabled={releaseMutation.isPending}
                          >
                            <div className="space-y-4">
                              <p>Are you sure you want to release this investment?</p>
                              <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm">
                                  <strong>Amount:</strong> ${usdcAmount.toFixed(2)} USDC
                                </p>
                                <p className="text-sm">
                                  <strong>Investor:</strong> {row.user_name || row.user_email || 'Unknown'}
                                </p>
                                <p className="text-sm">
                                  <strong>REIT:</strong> {row.reit_name || 'Unknown'}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                This will transfer the USDC from the escrow vault to your admin wallet and update the investment status to "Released".
                              </p>
                            </div>
                          </AppModal>
                        )}
                        {status === InvestmentStatus.Released && row.reit_id && (
                          <div className="flex gap-2">
                            <AppModal
                              title="Refund Investment"
                              submitLabel="Refund"
                              submit={() => refundMutation.mutate({
                                investmentPda: row.investment_pda,
                                reitId: row.reit_id!,
                              })}
                              submitDisabled={refundMutation.isPending}
                            >
                              <div className="space-y-4">
                                <p>Are you sure you want to refund this investment?</p>
                                <div className="bg-muted p-4 rounded-lg">
                                  <p className="text-sm">
                                    <strong>Amount:</strong> ${usdcAmount.toFixed(2)} USDC
                                  </p>
                                  <p className="text-sm">
                                    <strong>Investor:</strong> {row.user_name || row.user_email || 'Unknown'}
                                  </p>
                                  <p className="text-sm">
                                    <strong>REIT:</strong> {row.reit_name || 'Unknown'}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  This will mark the investment as refunded. The investor will need to be refunded off-chain.
                                </p>
                              </div>
                            </AppModal>
                            <AppModal
                              title="Wire Investment"
                              submitLabel="Wire"
                              submit={() => wireMutation.mutate({
                                investmentPda: row.investment_pda,
                                reitId: row.reit_id!,
                              })}
                              submitDisabled={wireMutation.isPending}
                            >
                              <div className="space-y-4">
                                <p>Are you sure you want to wire this investment?</p>
                                <div className="bg-muted p-4 rounded-lg">
                                  <p className="text-sm">
                                    <strong>Amount:</strong> ${usdcAmount.toFixed(2)} USDC
                                  </p>
                                  <p className="text-sm">
                                    <strong>Investor:</strong> {row.user_name || row.user_email || 'Unknown'}
                                  </p>
                                  <p className="text-sm">
                                    <strong>REIT:</strong> {row.reit_name || 'Unknown'}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  This will mark the investment as wired, indicating that the funds have been transferred to the REIT.
                                </p>
                              </div>
                            </AppModal>
                          </div>
                        )}
                        {status === InvestmentStatus.Wired && row.reit_id && (
                          <AppModal
                            title="Issue Share"
                            submitLabel={issueShareMutation.isPending ? "Issuing..." : "Issue Share"}
                            submitDisabled={issueShareMutation.isPending}
                            submit={() => {
                              // Fetch share price from metadata before issuing shares
                              const fetchAndIssue = async () => {
                                try {
                                  // Get fundraiser to find REIT mint
                                  const reitIdHash = new Uint8Array(uuidParse(row.reit_id!) as Uint8Array)
                                  const [fundraiserPda] = await PublicKey.findProgramAddress(
                                    [Buffer.from('fundraiser'), Buffer.from(reitIdHash)],
                                    new PublicKey(CANADIANREITINVEST_PROGRAM_ADDRESS as string)
                                  )

                                  const fundraiserAccount = await fetchMaybeFundraiser(
                                    client.rpc,
                                    fundraiserPda.toBase58() as Address
                                  )

                                  if (!fundraiserAccount?.exists || !fundraiserAccount.data.reitMint) {
                                    throw new Error('REIT mint not found')
                                  }

                                  // Fetch share price from metadata
                                  const { getSharePriceFromMetadata } = await import('@/lib/metaplex-update')
                                  const sharePrice = await getSharePriceFromMetadata(fundraiserAccount.data.reitMint)

                                  // Issue shares with the fetched share price
                                  issueShareMutation.mutate({
                                    investmentPda: row.investment_pda,
                                    reitId: row.reit_id!,
                                    sharePrice,
                                  })
                                } catch (error) {
                                  console.error('Failed to fetch share price:', error)
                                  // Fallback: issue shares without share price (will fetch internally)
                                  issueShareMutation.mutate({
                                    investmentPda: row.investment_pda,
                                    reitId: row.reit_id!,
                                    sharePrice: 0, // Will be fetched internally
                                  })
                                }
                              }
                              fetchAndIssue()
                            }}
                          >
                            <div className="space-y-4">
                              <p>Are you sure you want to issue shares for this investment?</p>
                              <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm">
                                  <strong>Amount:</strong> ${usdcAmount.toFixed(2)} USDC
                                </p>
                                <p className="text-sm">
                                  <strong>Investor:</strong> {row.user_name || row.user_email || 'Unknown'}
                                </p>
                                <p className="text-sm">
                                  <strong>REIT:</strong> {row.reit_name || 'Unknown'}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                This will mint REIT tokens to the investor's wallet based on the share price.
                              </p>
                            </div>
                          </AppModal>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}