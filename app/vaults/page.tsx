'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TEST_VAULTS, fetchVaultDetails, fetchLiveInventory } from '@/lib/api'
import type { VaultMetadata, LiveInventoryResponse } from '@/lib/types'
import { ExternalLink, ArrowRight, Loader2, Percent } from 'lucide-react'
import { calculateAPR, formatAPR } from '@/lib/calculateAPR'

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  56: 'BSC',
  8453: 'Base',
}

const CHAIN_COLORS: Record<number, string> = {
  1: 'bg-white/5 text-white/80 border-white/20',
  56: 'bg-white/5 text-white/80 border-white/20',
  8453: 'bg-white/5 text-white/80 border-white/20',
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatNumber(value: number, decimals: number = 2): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(decimals)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(decimals)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(decimals)}K`
  }
  return `$${value.toFixed(decimals)}`
}

interface VaultListItemProps {
  vault: VaultMetadata
  chainId: number
  address: string
  tvl?: number
}

function VaultListItem({ vault, chainId, address, tvl }: VaultListItemProps) {
  const token0 = vault.token0 || (vault as any)?.data?.tokens?.token0
  const token1 = vault.token1 || (vault as any)?.data?.tokens?.token1
  const tokenPair = token0 && token1 
    ? `${token0.symbol} / ${token1.symbol}`
    : vault.name || vault.symbol || 'Unknown Pair'
  
  const fees30d = vault.summary?.fees30d?.usdValue || 0
  const volume30d = vault.summary?.volume30d?.usdValue || 0

  // Calculate APR
  const aprData = tvl && tvl > 0 && fees30d > 0 
    ? calculateAPR({ tvl, feesEarned: fees30d, periodDays: 30 })
    : null

  return (
    <Link href={`/vault/${chainId}/${address}`}>
      <Card className="border-white/[0.08] bg-black/40 hover:border-[#EC9117]/50 transition-all cursor-pointer group hover:shadow-2xl hover:bg-black/60">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg text-white group-hover:text-[#EC9117] transition-colors">
                {tokenPair}
              </CardTitle>
              <CardDescription className="mt-1 font-mono text-xs text-white/40">
                {formatAddress(address)}
              </CardDescription>
            </div>
            <Badge className={CHAIN_COLORS[chainId] || 'bg-white/5 text-white/80'}>
              {CHAIN_NAMES[chainId] || `Chain ${chainId}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Exchange & Fee Tier */}
            <div className="flex items-center gap-3 text-sm">
              {vault.exchange && (
                <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                  {vault.exchange}
                </Badge>
              )}
              {vault.feeTier && (
                <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                  {vault.feeTier}
                </Badge>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/[0.06]">
              <div>
                <p className="text-xs text-white/40 mb-1">TVL</p>
                <p className="text-sm font-semibold text-white">
                  {tvl !== undefined && tvl !== null ? formatNumber(tvl, 1) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">APR (30d)</p>
                <p className="text-sm font-semibold text-[#EC9117]">
                  {aprData ? formatAPR(aprData.apr) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">30d Fees</p>
                <p className="text-sm font-semibold text-white">
                  {fees30d > 0 ? formatNumber(fees30d, 1) : 'N/A'}
                </p>
              </div>
            </div>

            {/* View Details Link */}
            <div className="flex items-center justify-end pt-2 border-t border-white/[0.06]">
              <span className="text-xs text-white/50 group-hover:text-[#EC9117] transition-colors flex items-center gap-1">
                View Details
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function VaultListSkeleton() {
  return (
    <Card className="border-white/[0.08] bg-black/40">
      <CardHeader>
        <Skeleton className="h-6 w-48 bg-white/10" />
        <Skeleton className="h-4 w-32 mt-2 bg-white/5" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 bg-white/10" />
            <Skeleton className="h-5 w-16 bg-white/10" />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Skeleton className="h-12 bg-white/5" />
            <Skeleton className="h-12 bg-white/5" />
            <Skeleton className="h-12 bg-white/5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VaultsIndexPage() {
  const [vaults, setVaults] = useState<(VaultMetadata & { address: string; chainId: number; tvl?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadVaults() {
      setLoading(true)
      setError(null)

      try {
        // Fetch vault details and inventory in parallel for each vault
        const results = await Promise.allSettled(
          TEST_VAULTS.map(async ({ address, chainId }) => {
            const [detailsResult, inventoryResult] = await Promise.allSettled([
              fetchVaultDetails(chainId, address),
              fetchLiveInventory(chainId, address),
            ])

            const vaultData = detailsResult.status === 'fulfilled' ? detailsResult.value : null
            const inventory = inventoryResult.status === 'fulfilled' ? inventoryResult.value : null

            // Log errors if any
            if (detailsResult.status === 'rejected') {
              console.warn(`Failed to fetch vault details for ${address}:`, detailsResult.reason)
            }
            if (inventoryResult.status === 'rejected') {
              console.warn(`Failed to fetch inventory for ${address}:`, inventoryResult.reason)
            }

            // Debug logging
            if (typeof window !== 'undefined') {
              console.log(`Vault ${address} (${chainId}):`, {
                hasDetails: !!vaultData,
                hasInventory: !!inventory,
                inventoryTvl: inventory?.data?.totalValueUSD,
                vaultTvl: vaultData?.tvl,
                vaultTvlType: typeof vaultData?.tvl,
                inventoryDataKeys: inventory?.data ? Object.keys(inventory.data) : null,
                vaultDataKeys: vaultData ? Object.keys(vaultData) : null,
              })
            }

            // Try multiple sources for TVL (same logic as useVaultKPIs hook)
            let tvl: number | undefined = undefined
            
            // Priority 1: inventory.data.totalValueUSD (most accurate - same as individual vault page)
            // Note: Accept 0 as valid (vault might be empty)
            if (inventory?.data?.totalValueUSD !== undefined && inventory.data.totalValueUSD !== null) {
              const tvlValue = inventory.data.totalValueUSD
              if (typeof tvlValue === 'number' && !isNaN(tvlValue)) {
                tvl = tvlValue // Accept 0 as valid value
              }
            }
            // Priority 2: vault.tvl as string or number
            if (tvl === undefined && vaultData?.tvl) {
              const parsedTvl = typeof vaultData.tvl === 'string' 
                ? parseFloat(vaultData.tvl) 
                : typeof vaultData.tvl === 'number'
                ? vaultData.tvl
                : NaN
              if (!isNaN(parsedTvl)) {
                tvl = parsedTvl // Accept 0 as valid value
              }
            }
            // Priority 3: nested data.totalValueUSD
            if (tvl === undefined && (vaultData as any)?.data?.totalValueUSD !== undefined) {
              const nestedTvl = (vaultData as any).data.totalValueUSD
              if (typeof nestedTvl === 'number' && !isNaN(nestedTvl)) {
                tvl = nestedTvl // Accept 0 as valid value
              }
            }

            return {
              ...(vaultData || {}),
              address,
              chainId,
              tvl,
            }
          })
        )

        const loadedVaults = results
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value)

        setVaults(loadedVaults)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vaults')
      } finally {
        setLoading(false)
      }
    }

    loadVaults()
  }, [])

  return (
    <div className="min-h-screen bg-[#0B0909]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Arrakis Vaults</h1>
          <p className="text-white/60">
            Browse and explore all available liquidity vaults
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEST_VAULTS.map((_, idx) => (
              <VaultListSkeleton key={idx} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-white/[0.08] bg-black/40">
            <CardContent className="pt-6">
              <p className="text-white/70">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Vaults Grid */}
        {!loading && !error && (
          <>
            {vaults.length === 0 ? (
              <Card className="border-white/[0.08] bg-black/40">
                <CardContent className="pt-6">
                  <p className="text-white/50 text-center py-8">
                    No vaults found
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vaults.map((vault) => (
                  <VaultListItem
                    key={`${vault.chainId}-${vault.address}`}
                    vault={vault}
                    chainId={vault.chainId}
                    address={vault.address}
                    tvl={vault.tvl}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer Info */}
        {!loading && vaults.length > 0 && (
          <div className="mt-8 pt-6 border-t border-white/[0.08]">
            <p className="text-sm text-white/50 text-center">
              Showing {vaults.length} of {TEST_VAULTS.length} vaults
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

