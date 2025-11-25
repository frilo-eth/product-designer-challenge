'use client'

import { useState, useEffect, useMemo as ReactUseMemo } from 'react'
import * as React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useLiquidityChartData,
  useInventoryRatioChartData,
  usePriceImpactChartData,
  useFeesChartData,
  useVaultKPIs,
  type Timeframe,
} from '@/lib/hooks/useChartData'
import {
  FeesChart,
  InventoryRatioChart,
  PriceImpactChart,
} from '@/components/charts'
import {
  LiquidityProfileChart,
  LiquidityProfilePills,
} from '@/components/liquidity'
import {
  fetchVaultDetails,
  fetchLiquidityProfile,
  fetchLiveInventory,
  fetchVaultBalance,
  fetchPriceImpact,
  fetchFeesHistory,
} from '@/lib/api'
import type {
  VaultMetadata,
  LiquidityProfile,
  LiveInventoryResponse,
  VaultBalanceResponse,
  PriceImpactResponse,
  FeesHistoryResponse,
} from '@/lib/types'
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity, BarChart3, ArrowLeft, AlertCircle, Percent } from 'lucide-react'
import { transformLiquidityProfile } from '@/lib/transformLiquidityProfile'
import { ErrorAwareValue } from '@/components/ui/error-aware-value'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { calculateAPR, formatAPR } from '@/lib/calculateAPR'

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  56: 'BSC',
  8453: 'Base',
  42161: 'Arbitrum',
  10: 'Optimism',
}

export default function VaultDashboard() {
  const params = useParams()
  const chainId = parseInt(params.chainId as string, 10)
  const address = params.address as string

  const [vaultDetails, setVaultDetails] = useState<VaultMetadata | null>(null)
  const [liquidityProfile, setLiquidityProfile] = useState<LiquidityProfile | null>(null)
  const [inventory, setInventory] = useState<LiveInventoryResponse | null>(null)
  const [balanceHistory, setBalanceHistory] = useState<VaultBalanceResponse | null>(null)
  const [priceImpact, setPriceImpact] = useState<PriceImpactResponse | null>(null)
  const [feesHistory, setFeesHistory] = useState<FeesHistoryResponse | null>(null)
  const [inventoryTimeframe, setInventoryTimeframe] = useState<Timeframe>('1M')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        // Fetch all data in parallel
        const [details, liquidity, liveInventory, balance, impact, fees] = await Promise.allSettled([
          fetchVaultDetails(chainId, address),
          fetchLiquidityProfile(chainId, address),
          fetchLiveInventory(chainId, address),
          fetchVaultBalance(chainId, address),
          fetchPriceImpact(chainId, address),
          fetchFeesHistory(chainId, address),
        ])

        if (details.status === 'fulfilled') {
          const vaultData = details.value
          // Log structure for debugging
          if (typeof window !== 'undefined') {
            const vaultDataAny = vaultData as any
            console.log('Vault details structure:', {
              hasToken0: !!vaultData?.token0,
              hasToken1: !!vaultData?.token1,
              hasData: !!vaultDataAny?.data,
              keys: Object.keys(vaultData || {}),
              token0: vaultData?.token0,
              token1: vaultData?.token1,
            })
          }
          setVaultDetails(vaultData)
        }
        if (liquidity.status === 'fulfilled') {
          setLiquidityProfile(liquidity.value)
        }
        if (liveInventory.status === 'fulfilled') {
          setInventory(liveInventory.value)
        }
        if (balance.status === 'fulfilled') {
          setBalanceHistory(balance.value)
        }
        if (impact.status === 'fulfilled') {
          setPriceImpact(impact.value)
        } else {
          console.warn('Price impact fetch failed:', impact.status === 'rejected' ? impact.reason : 'unknown')
        }
        if (fees.status === 'fulfilled') {
          setFeesHistory(fees.value)
        } else {
          console.warn('Fees history fetch failed:', fees.status === 'rejected' ? fees.reason : 'unknown')
        }

        // Check for errors in fulfilled promises
        if (details.status === 'rejected') {
          console.error('Vault details fetch failed:', details.reason)
        }
        if (liquidity.status === 'rejected') {
          console.error('Liquidity profile fetch failed:', liquidity.reason)
        }
        if (liveInventory.status === 'rejected') {
          console.error('Live inventory fetch failed:', liveInventory.reason)
        }
        if (balance.status === 'rejected') {
          console.error('Vault balance fetch failed:', balance.reason)
        }
      } catch (err) {
        console.error('Error loading vault data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load vault data')
      } finally {
        setLoading(false)
      }
    }

    if (chainId && address) {
      loadData()
    }
  }, [chainId, address])

  // Transform data for charts
  // Use transformLiquidityProfile for the new chart format
  // Scale liquidity values to USD using TVL from inventory
  const liquidityChartData = ReactUseMemo(() => {
    if (!liquidityProfile) return null
    const tvlUSD = inventory?.data?.totalValueUSD
    const transformed = transformLiquidityProfile(liquidityProfile as any, undefined, tvlUSD)
    return transformed
  }, [liquidityProfile, inventory])
  const inventoryChartData = useInventoryRatioChartData(balanceHistory, inventoryTimeframe)
  const priceImpactChartData = usePriceImpactChartData(
    priceImpact,
    vaultDetails?.summary?.priceImpact
  )
  const feesChartData = useFeesChartData(feesHistory, vaultDetails?.summary?.fees30d)
  const kpis = useVaultKPIs(
    inventory,
    balanceHistory,
    vaultDetails?.summary?.priceImpact,
    vaultDetails?.summary?.fees30d,
    vaultDetails?.summary?.volume30d
  )

  // Detect error states for KPIs
  // Error = API failed to return data (null/undefined), not just zero values
  const hasInventoryError = !inventory?.data
  const hasBalanceHistoryError = !balanceHistory?.data || balanceHistory.data.length < 2
  const hasFeesSummaryError = !vaultDetails?.summary?.fees30d || 
    vaultDetails.summary.fees30d.usdValue === null || 
    vaultDetails.summary.fees30d.usdValue === undefined
  const hasVolumeSummaryError = !vaultDetails?.summary?.volume30d || 
    vaultDetails.summary.volume30d.usdValue === null || 
    vaultDetails.summary.volume30d.usdValue === undefined
  
  // Composition error: percentages don't sum to ~100% (indicates invalid API response)
  // Note: Both being 0 might be valid if vault is empty, but sum not being ~100% is definitely an error
  const compositionError = !!kpis && Math.abs(kpis.token0Percentage + kpis.token1Percentage - 100) > 1
  
  // TVL error: inventory API failed to return data
  const tvlError = hasInventoryError
  
  // Utilization error: inventory API failed to return data
  const utilizationError = hasInventoryError

  // Calculate APR using 30d fees and TVL
  const aprData = ReactUseMemo(() => {
    const tvl = kpis?.tvl
    const fees30d = vaultDetails?.summary?.fees30d?.usdValue
    
    if (!tvl || tvl <= 0 || !fees30d || fees30d < 0) {
      return null
    }

    return calculateAPR({
      tvl,
      feesEarned: fees30d,
      periodDays: 30,
    })
  }, [kpis?.tvl, vaultDetails?.summary?.fees30d?.usdValue])

  // APR error: either TVL or fees data is missing
  const aprError = !kpis?.tvl || tvlError || hasFeesSummaryError

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 bg-[#0B0909] min-h-screen">
        <div className="space-y-6">
          <Skeleton className="h-24 w-full bg-white/5" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-full bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !vaultDetails) {
    return (
      <div className="container mx-auto px-4 py-8 bg-[#0B0909] min-h-screen">
        <Card className="border-white/[0.08] bg-black/40">
          <CardContent className="pt-6">
            <p className="text-white">Error: {error || 'Vault not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if token information is available - handle different response structures
  const vaultDataAny = vaultDetails as any
  const token0 = vaultDetails.token0 || vaultDataAny?.data?.tokens?.token0
  const token1 = vaultDetails.token1 || vaultDataAny?.data?.tokens?.token1
  
  if (!token0 || !token1) {
    return (
      <div className="container mx-auto px-4 py-8 bg-[#0B0909] min-h-screen">
        <Card className="border-white/[0.08] bg-black/40">
          <CardContent className="pt-6">
            <p className="text-white">Error: Vault details incomplete - missing token information</p>
            <p className="text-xs text-white/50 mt-2">
              Available keys: {Object.keys(vaultDetails).join(', ')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tokenPair = `${token0.symbol} / ${token1.symbol}`
  const chainName = CHAIN_NAMES[chainId] || `Chain ${chainId}`

  return (
    <div className="min-h-screen bg-[#0B0909]">
      <div className="container mx-auto px-4 py-8">
        {/* Back to Vaults Link */}
        <Link 
          href="/vaults"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#EC9117] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vaults
        </Link>
        {/* Top Metadata Bar */}
        <Card className="mb-6 border-white/[0.08] bg-black/40">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <span className="text-white/40">Chain:</span>{' '}
                <span className="font-medium text-white">{chainName}</span>
              </div>
              <div>
                <span className="text-white/40">Pair:</span>{' '}
                <span className="font-medium text-white">{tokenPair}</span>
              </div>
              {vaultDetails.exchange && (
                <div>
                  <span className="text-white/40">DEX:</span>{' '}
                  <span className="font-medium text-white">{vaultDetails.exchange}</span>
                </div>
              )}
              {vaultDetails.feeTier && (
                <div>
                  <span className="text-white/40">Fee Tier:</span>{' '}
                  <span className="font-medium text-white">{vaultDetails.feeTier}</span>
                </div>
              )}
              {vaultDetails.lastUpdated && (
                <div>
                  <span className="text-white/40">Last Updated:</span>{' '}
                  <span className="font-medium text-white">
                    {new Date(vaultDetails.lastUpdated).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* CFO Hero KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis && (
            <>
              <Card className="border-white/[0.08] bg-black/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/40">TVL</p>
                      <ErrorAwareValue
                        value={kpis.tvl}
                        formatter={(val) => `$${val.toLocaleString()}`}
                        errorCondition={tvlError}
                        errorMessage="TVL data unavailable. The Arrakis Indexer API failed to return inventory data for this vault."
                        className="text-2xl font-bold text-white"
                      />
                    </div>
                    <DollarSign className="h-8 w-8 text-[#EC9117]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/[0.08] bg-black/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm text-white/40 cursor-help inline-flex items-center gap-1">
                              APR (30d)
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-black/95 border-white/[0.12] text-white">
                            <p className="text-xs">
                              Calculated from 30-day fees vs TVL. Actual APRs may be higher as some liquidity 
                              is not in-range. Individual positions may vary based on price range.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {aprError ? (
                        <ErrorAwareValue
                          value={null}
                          errorCondition={true}
                          errorMessage="APR calculation unavailable. Requires both TVL and 30-day fees data from the Arrakis Indexer API."
                          className="text-2xl font-bold text-white"
                        />
                      ) : aprData ? (
                        <div>
                          <p className="text-2xl font-bold text-[#EC9117]">
                            {formatAPR(aprData.apr)}
                          </p>
                          {aprData.warning && (
                            <p className="text-xs text-white/40 mt-1">
                              {aprData.warning}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-2xl font-bold text-white/40">—</p>
                      )}
                    </div>
                    <Percent className="h-8 w-8 text-[#EC9117]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/[0.08] bg-black/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/50">Composition</p>
                      {compositionError ? (
                        <ErrorAwareValue
                          value={null}
                          errorCondition={true}
                          errorMessage="Composition data unavailable or invalid. The Arrakis Indexer API returned invalid token percentage data."
                          fallback={`${kpis.token0Percentage.toFixed(1)}% / ${kpis.token1Percentage.toFixed(1)}%`}
                          className="text-2xl font-bold"
                        />
                      ) : (
                      <p className="text-2xl font-bold">
                        {kpis.token0Percentage.toFixed(1)}% / {kpis.token1Percentage.toFixed(1)}%
                      </p>
                      )}
                    </div>
                    <PieChart className="h-8 w-8 text-white" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/[0.08] bg-black/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/50">24h Drift</p>
                      {hasBalanceHistoryError ? (
                        <ErrorAwareValue
                          value={null}
                          errorCondition={true}
                          errorMessage="24h drift calculation unavailable. The Arrakis Indexer API failed to return sufficient balance history data (need at least 2 data points)."
                          className="text-2xl font-bold"
                        />
                      ) : (
                      <div className="flex items-center gap-2">
                        {kpis.drift24h >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <p className="text-2xl font-bold">
                          {kpis.drift24h >= 0 ? '+' : ''}
                          {kpis.drift24h.toFixed(2)}%
                        </p>
                      </div>
                      )}
                    </div>
                    <Activity className="h-8 w-8 text-white/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/[0.08] bg-black/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/50">Utilization</p>
                      <ErrorAwareValue
                        value={kpis.utilizationPercentage}
                        formatter={(val) => `${val.toFixed(1)}%`}
                        errorCondition={utilizationError}
                        errorMessage="Utilization data unavailable. The Arrakis Indexer API failed to return utilization percentage for this vault."
                        className="text-2xl font-bold"
                      />
                    </div>
                    <BarChart3 className="h-8 w-8 text-white/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/[0.08] bg-black/40">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-white/50 mb-2">Price Impact (Buy)</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">$5k:</span>
                        <span className="font-medium">{kpis.priceImpact5k.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">$10k:</span>
                        <span className="font-medium">{kpis.priceImpact10k.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">$25k:</span>
                        <span className="font-medium">{kpis.priceImpact25k.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/[0.08] bg-black/40">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-white/50">30d Fees</p>
                    <ErrorAwareValue
                      value={kpis.fees30d}
                      formatter={(val) => `$${val.toLocaleString()}`}
                      errorCondition={hasFeesSummaryError}
                      errorMessage="30d fees data unavailable. The Arrakis Indexer API failed to return fees summary data for this vault."
                      className="text-2xl font-bold"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/[0.08] bg-black/40">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-white/50">30d Volume</p>
                    <ErrorAwareValue
                      value={kpis.volume30d}
                      formatter={(val) => `$${val.toLocaleString()}`}
                      errorCondition={hasVolumeSummaryError}
                      errorMessage="30d volume data unavailable. The Arrakis Indexer API failed to return volume summary data for this vault."
                      className="text-2xl font-bold"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Grid - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liquidity Profile Module */}
          <Card className="border-white/[0.08] bg-black/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-neutral-300">Liquidity Distribution (%)</CardTitle>
            </CardHeader>
            <CardContent>
              {liquidityChartData ? (
                <>
                  <div className="mb-6">
                    <LiquidityProfileChart
                      chartData={liquidityChartData.points}
                      leftBound={liquidityChartData.leftBound}
                      rightBound={liquidityChartData.rightBound}
                      weightedCenter={liquidityChartData.weightedCenter}
                      currentPrice={liquidityChartData.currentPrice}
                      token0Symbol={token0?.symbol}
                      token1Symbol={token1?.symbol}
                      currentTick={(liquidityProfile as any)?.currentTick}
                      token0Amount={inventory?.data?.tokens?.token0?.amount}
                      token1Amount={inventory?.data?.tokens?.token1?.amount}
                      token0Decimals={inventory?.data?.tokens?.token0?.decimals}
                      token1Decimals={inventory?.data?.tokens?.token1?.decimals}
                    />
                  </div>
                  <div className="mt-8">
                    <LiquidityProfilePills
                      chartData={liquidityChartData.points}
                      leftBound={liquidityChartData.leftBound}
                      rightBound={liquidityChartData.rightBound}
                      weightedCenter={liquidityChartData.weightedCenter}
                      currentPrice={liquidityChartData.currentPrice}
                />
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-white/50">
                  No liquidity data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Ratio Over Time */}
          <Card className="border-white/[0.08] bg-black/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Inventory Ratio Over Time</CardTitle>
                  <CardDescription>Token composition history</CardDescription>
                </div>
                <div className="flex gap-2">
                  {(['24h', '1W', '1M'] as Timeframe[]).map((tf) => (
                    <Button
                      key={tf}
                      variant={inventoryTimeframe === tf ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInventoryTimeframe(tf)}
                    >
                      {tf}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryChartData.length > 0 ? (
                <InventoryRatioChart
                  data={inventoryChartData}
                  token0Symbol={token0?.symbol || 'Token0'}
                  token1Symbol={token1?.symbol || 'Token1'}
                  timeframe={inventoryTimeframe}
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-white/50">
                  No inventory history data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price Impact Chart */}
          <Card className="border-white/[0.08] bg-black/40">
            <CardHeader>
              <CardTitle className="text-lg">Price Impact</CardTitle>
              <CardDescription>Buy vs Sell impact by trade size</CardDescription>
            </CardHeader>
            <CardContent>
              <PriceImpactChart data={priceImpactChartData} />
            </CardContent>
          </Card>

          {/* Fees Over Time */}
          <Card className="border-white/[0.08] bg-black/40">
            <CardHeader>
              <CardTitle className="text-lg">Fees Over Time</CardTitle>
              <CardDescription>
                {feesChartData
                  ? 'Historical fee earnings'
                  : '30d summary only - history unavailable'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feesChartData ? (
                <FeesChart 
                  data={feesChartData} 
                  token0Symbol={token0?.symbol || 'Token0'}
                  token1Symbol={token1?.symbol || 'Token1'}
                />
              ) : vaultDetails?.summary?.fees30d ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    {hasFeesSummaryError || !vaultDetails.summary.fees30d.usdValue ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <p className="text-2xl font-bold mb-2 text-white/50">N/A</p>
                              <p className="text-sm text-white/50">30d Total Fees</p>
                              <Badge variant="outline" className="mt-2 text-xs">
                                <AlertCircle className="h-3 w-3 mr-1 inline" />
                                API Error
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">30d fees data unavailable. The Arrakis Indexer API failed to return fees summary data for this vault.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <>
                        <p className="text-2xl font-bold mb-2">
                          ${(vaultDetails.summary.fees30d.usdValue || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-white/50">30d Total Fees</p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          From Summary
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center cursor-help">
                          <p className="text-white/50 mb-2">No fees data available</p>
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1 inline" />
                            API Error
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Fees history data unavailable. The Arrakis Indexer API failed to return fees data for this vault.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

