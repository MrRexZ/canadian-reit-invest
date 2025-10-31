import { SolanaClusterId, useWalletUi, useWalletUiCluster } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

type NetworkSelectorProps = {
  // default: shows text label. icon: square icon button only (for sidebar footer)
  variant?: 'default' | 'icon'
}

export function NetworkSelector({ variant = 'default' }: NetworkSelectorProps) {
  const { cluster } = useWalletUi()
  const { clusters, setCluster } = useWalletUiCluster()
  const queryClient = useQueryClient()

  // Filter to only show localnet and devnet by checking labels and IDs
  const filteredClusters = clusters.filter((c) => {
    const label = c.label.toLowerCase()
    const id = c.id.toLowerCase()
    return (
      label.includes('localnet') ||
      label.includes('devnet') ||
      id.includes('localnet') ||
      id.includes('devnet')
    )
  })

  const handleClusterChange = (clusterId: string) => {
    console.log('Switching cluster from', cluster.id, 'to', clusterId)
    setCluster(clusterId as SolanaClusterId)
    // Persist preference in localStorage
    localStorage.setItem('preferred-network', clusterId)
    // Invalidate all queries to refresh data from new cluster
    queryClient.invalidateQueries()
    console.log('Cluster switched successfully')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 rounded-md px-2 gap-2',
              'group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:px-0'
            )}
          >
            <Globe className="h-5 w-5" />
            <span className="text-sm group-data-[collapsible=icon]:hidden">
              {cluster.label}
            </span>
          </Button>
        ) : (
          <Button variant="outline" className="w-full justify-start">
            <Globe className="h-4 w-4 mr-2" />
            {cluster.label}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuRadioGroup value={cluster.id} onValueChange={handleClusterChange}>
          {filteredClusters.map((clusterOption) => (
            <DropdownMenuRadioItem key={clusterOption.id} value={clusterOption.id}>
              {clusterOption.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
