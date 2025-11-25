/**
 * VaultCard Component
 *
 * Displays a single vault with its metadata and raw API data
 * Shows loading and error states
 */

'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RawDataDisplay } from '@/components/raw-data-display'
import { formatAddress, formatNumber } from '@/lib/utils'
import { Loader2, AlertCircle } from 'lucide-react'
import { calculateAPR, formatAPR } from '@/lib/calculateAPR'

interface VaultCardProps {
  vaultAddress: string
  chainId: number
}

export function VaultCard({ vaultAddress, chainId }: VaultCardProps) {
  const [data, setData] = React.useState<any | null>(null)
  const [tvl, setTvl] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch vault details and inventory in parallel
        const [vaultResponse, inventoryResponse] = await Promise.all([
          fetch(`/api/vaults/${chainId}/${vaultAddress}`),
          fetch(`/api/vaults/${chainId}/${vaultAddress}/live-inventory`),
        ])

        if (!vaultResponse.ok) {
          throw new Error(`Failed to fetch vault data: ${vaultResponse.statusText}`)
        }

        const vaultData = await vaultResponse.json()
        setData(vaultData)

        // Try to get TVL from inventory
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json()
          if (inventoryData?.data?.totalValueUSD !== undefined) {
            setTvl(inventoryData.data.totalValueUSD)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [vaultAddress, chainId])

  if (loading) {
    return (
      <Card className="border-white/[0.08] bg-black/40">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2 text-white/60">
            <Loader2 className="h-8 w-8 animate-spin text-[#EC9117]" />
            <p className="text-sm">Loading vault data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-white/[0.08] bg-black/40">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2 text-white/80">
            <AlertCircle className="h-8 w-8 text-white/60" />
            <p className="text-sm font-medium">Failed to load vault</p>
            <p className="text-xs text-white/40">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const token0 = data.data?.tokens?.token0
  const token1 = data.data?.tokens?.token1
  const volume30d = data.summary?.volume30d?.usdValue
  const fees30d = data.summary?.fees30d?.usdValue

  // Calculate APR
  const aprData = tvl && tvl > 0 && fees30d && fees30d > 0
    ? calculateAPR({ tvl, feesEarned: fees30d, periodDays: 30 })
    : null

  return (
    <Card className="border-white/[0.08] bg-black/40">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-white">
              {data.tokenPair || 'Vault'}
            </CardTitle>
            <CardDescription className="mt-1 text-white/50">
              {formatAddress(data.vaultId)}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-white/5 text-white/80 border-white/10">
            {data.data?.general?.chain || `Chain ${chainId}`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Token Pair */}
          {token0 && token1 && (
            <div>
              <p className="text-sm text-white/40 mb-1">Token Pair</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-white/20 text-white/80">{token0.symbol}</Badge>
                <span className="text-white/40">/</span>
                <Badge variant="outline" className="border-white/20 text-white/80">{token1.symbol}</Badge>
              </div>
            </div>
          )}

          {/* Pool Info */}
          {data.data?.pool && (
            <div>
              <p className="text-sm text-white/40 mb-1">Pool</p>
              <p className="text-sm font-medium text-white">{data.data.pool.name}</p>
              <p className="text-xs text-white/40">Fee: {data.data.pool.feeTier}%</p>
            </div>
          )}

          {/* APR */}
          {aprData && (
            <div>
              <p className="text-sm text-white/40 mb-1">
                APR (30d)
              </p>
              <p className="text-lg font-semibold text-[#EC9117]">
                {formatAPR(aprData.apr)}
              </p>
              {aprData.warning && (
                <p className="text-xs text-white/40 mt-1">{aprData.warning}</p>
              )}
            </div>
          )}

          {/* 30d Fees */}
          {fees30d && (
            <div>
              <p className="text-sm text-white/40 mb-1">
                30d Fees Earned
              </p>
              <p className="text-lg font-semibold text-white">
                ${formatNumber(fees30d, 2)}
              </p>
            </div>
          )}

          {/* Raw Data Display */}
          <RawDataDisplay data={data} defaultExpanded={false} />
        </div>
      </CardContent>
    </Card>
  )
}
