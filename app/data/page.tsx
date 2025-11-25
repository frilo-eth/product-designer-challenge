/**
 * Data Dashboard - API Testing Page
 * 
 * Simple dashboard to verify all API functions are working correctly
 * Tests: fetchVaultDetails, fetchLiquidityProfile, fetchLiveInventory, 
 *        fetchPriceImpact, fetchFeesHistory
 */

'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchVaultDetails,
  fetchLiquidityProfile,
  fetchLiveInventory,
  fetchVaultBalance,
  fetchPriceImpact,
  fetchFeesHistory,
  TEST_VAULTS,
} from '@/lib/api'
import type {
  VaultMetadata,
  LiquidityProfile,
  LiveInventoryResponse,
  VaultBalanceResponse,
  PriceImpactResponse,
  FeesHistoryResponse,
  ApiError,
} from '@/lib/types'
import { CheckCircle2, XCircle, Loader2, Play, AlertTriangle, Info, X, ChevronRight, Copy, Check } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  FeesChart,
  InventoryRatioChart,
  LiquidityDistributionChart,
  PriceImpactChart,
} from '@/components/charts'
import { transformLiquidityProfile } from '@/lib/transformLiquidityProfile'

type ApiTestStatus = 'idle' | 'loading' | 'success' | 'error'

interface ApiTestResult<T> {
  status: ApiTestStatus
  data?: T
  error?: ApiError
}

interface VaultTestResult {
  vault: { chainId: number; address: string }
  vaultDetails: ApiTestResult<VaultMetadata>
  liquidityProfile: ApiTestResult<LiquidityProfile>
  inventoryRatio: ApiTestResult<LiveInventoryResponse>
  vaultBalance: ApiTestResult<VaultBalanceResponse>
  priceImpact: ApiTestResult<PriceImpactResponse>
  feesHistory: ApiTestResult<FeesHistoryResponse>
}

// Helper function to get chain name from chain ID
const getChainName = (chainId: number): string => {
  const chainMap: Record<number, string> = {
    1: 'Ethereum',
    56: 'BSC',
    8453: 'Base',
  }
  return chainMap[chainId] || `Chain ${chainId}`
}

export default function DataDashboard() {
  const [bulkTestResults, setBulkTestResults] = React.useState<VaultTestResult[]>([])
  const [isBulkTesting, setIsBulkTesting] = React.useState(false)
  const [selectedCard, setSelectedCard] = React.useState<{
    vaultIdx: number
    apiName: string
  } | null>(null)
  const [copiedTab, setCopiedTab] = React.useState<string | null>(null)

  const testAllVaults = React.useCallback(async () => {
    setIsBulkTesting(true)
    setBulkTestResults([])

    const results: VaultTestResult[] = []

    for (const vault of TEST_VAULTS) {
      const result: VaultTestResult = {
        vault,
        vaultDetails: { status: 'loading' },
        liquidityProfile: { status: 'loading' },
        inventoryRatio: { status: 'loading' },
        vaultBalance: { status: 'loading' },
        priceImpact: { status: 'loading' },
        feesHistory: { status: 'loading' },
      }

      // Test all APIs for this vault
      try {
        result.vaultDetails = { status: 'success', data: await fetchVaultDetails(vault.chainId, vault.address) }
      } catch (error) {
        result.vaultDetails = { status: 'error', error: error as ApiError }
      }

      try {
        result.liquidityProfile = { status: 'success', data: await fetchLiquidityProfile(vault.chainId, vault.address) }
      } catch (error) {
        result.liquidityProfile = { status: 'error', error: error as ApiError }
      }

      try {
        result.inventoryRatio = { status: 'success', data: await fetchLiveInventory(vault.chainId, vault.address) }
      } catch (error) {
        result.inventoryRatio = { status: 'error', error: error as ApiError }
      }

      try {
        result.vaultBalance = { status: 'success', data: await fetchVaultBalance(vault.chainId, vault.address) }
      } catch (error) {
        result.vaultBalance = { status: 'error', error: error as ApiError }
      }

      try {
        result.priceImpact = { status: 'success', data: await fetchPriceImpact(vault.chainId, vault.address) }
      } catch (error) {
        result.priceImpact = { status: 'error', error: error as ApiError }
      }

      try {
        result.feesHistory = { status: 'success', data: await fetchFeesHistory(vault.chainId, vault.address) }
      } catch (error) {
        result.feesHistory = { status: 'error', error: error as ApiError }
      }

      results.push(result)
      setBulkTestResults([...results])
    }

    setIsBulkTesting(false)
  }, [])

  // Auto-load all vaults on mount
  React.useEffect(() => {
    testAllVaults()
  }, [testAllVaults])

  // Transform data for charts
  const transformDataForCharts = (apiName: string, rawData: any, vaultDetails?: VaultMetadata): any => {
    switch (apiName) {
      case 'Liquidity Profile': {
        let transformationError: { reason: string; details?: any } | null = null
        const transformed = transformLiquidityProfile(rawData, (error) => {
          transformationError = error
        })
        if (!transformed) {
          return {
            _error: transformationError || { reason: 'unknown' },
            _rawData: rawData,
          }
        }
        return {
          chartData: transformed.points,
          leftBound: transformed.leftBound,
          rightBound: transformed.rightBound,
          weightedCenter: transformed.weightedCenter,
        }
      }
      
      case 'Vault Balance': {
        if (!rawData?.data) return null
        return {
          chartData: rawData.data.map((point: any) => ({
            timestamp: new Date(point.timestamp),
            date: new Date(point.timestamp).toLocaleDateString(),
            token0Percentage: point.tokens?.token0?.percentage || 0,
            token1Percentage: point.tokens?.token1?.percentage || 0,
            totalValueUSD: point.totalValueUSD || 0,
          })),
        }
      }
      
      case 'Price Impact': {
        const classifyZone = (impact: number): 'efficient' | 'warning' | 'critical' => {
          if (impact < 2) return 'efficient'
          if (impact < 5) return 'warning'
          return 'critical'
        }

        const buildInsights = (
          chartData: Array<{ tradeSize: number; buyImpact: number; sellImpact: number; efficiencyZone: string }>,
          depletionThreshold?: number | null
        ): string[] => {
          if (!chartData.length) return []
          const insights: string[] = []
          const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
          const lastPoint = chartData[chartData.length - 1]
          if (lastPoint.buyImpact > 0 && lastPoint.sellImpact > 0) {
            const diff = ((lastPoint.sellImpact - lastPoint.buyImpact) / lastPoint.buyImpact) * 100
            if (Math.abs(diff) > 5) {
              insights.push(
                `${diff > 0 ? 'Sell-side' : 'Buy-side'} impact is ${Math.abs(diff).toFixed(0)}% higher than ${
                  diff > 0 ? 'buy' : 'sell'
                }-side at ${formatter.format(lastPoint.tradeSize)} → vault imbalance.`
              )
            }
          }
          const efficientPoints = chartData.filter(point => point.efficiencyZone === 'efficient')
          if (efficientPoints.length) {
            const limit = efficientPoints[efficientPoints.length - 1].tradeSize
            insights.push(`Efficient execution recommended for trades ≤ ${formatter.format(limit)}.`)
          }
          if (depletionThreshold) {
            insights.push(`Vault approaches depletion for trades above ${formatter.format(depletionThreshold)}.`)
          } else {
            const criticalPoint = chartData.find(point => point.efficiencyZone === 'critical')
            if (criticalPoint) {
              insights.push(`Critical impact begins around ${formatter.format(criticalPoint.tradeSize)}.`)
            }
          }
          return insights
        }

        const buildChartDataFromMaps = (buyMap: Record<string, number>, sellMap: Record<string, number>) => {
          const tradeSizes = new Set([
            ...Object.keys(buyMap).map(size => parseFloat(size)),
            ...Object.keys(sellMap).map(size => parseFloat(size)),
          ])

          return Array.from(tradeSizes)
            .sort((a, b) => a - b)
            .map((tradeSize) => {
              const buyImpact = Math.abs(buyMap[tradeSize.toString()] ?? 0)
              const sellImpact = Math.abs(sellMap[tradeSize.toString()] ?? 0)
              return {
                tradeSize,
                buyImpact,
                sellImpact,
                efficiencyZone: classifyZone(Math.max(buyImpact, sellImpact)),
              }
            })
        }

        const buildChartDataFromArray = (dataArray: any[]) => {
          const grouped = new Map<number, { buyImpact: number; sellImpact: number }>()

          dataArray.forEach((point: any) => {
            const tradeSize = parseFloat(point.tradeSize || point.tradeSizeUsd || '0')
            if (!tradeSize) return
            const impact = Math.abs(point.priceImpactPercent || point.priceImpactBps || 0)
            const entry = grouped.get(tradeSize) || { buyImpact: 0, sellImpact: 0 }
            if ((point.direction || '').toLowerCase() === 'buy') {
              entry.buyImpact = impact
            } else {
              entry.sellImpact = impact
            }
            grouped.set(tradeSize, entry)
          })

          return Array.from(grouped.entries())
            .map(([tradeSize, entry]) => ({
              tradeSize,
              buyImpact: entry.buyImpact,
              sellImpact: entry.sellImpact,
              efficiencyZone: classifyZone(Math.max(entry.buyImpact, entry.sellImpact)),
            }))
            .sort((a, b) => a.tradeSize - b.tradeSize)
        }

        if (rawData?.buy && rawData?.sell) {
          const chartData = buildChartDataFromMaps(rawData.buy, rawData.sell)
          const depletionPoint = chartData.find(point => Math.max(point.buyImpact, point.sellImpact) >= 5)
          return {
            chartData,
            marketDepth: rawData.marketDepth2pr || null,
            depletionThreshold: depletionPoint?.tradeSize || null,
            insights: buildInsights(chartData, depletionPoint?.tradeSize || null),
          }
        }
        if (rawData?.data) {
          const chartData = buildChartDataFromArray(rawData.data)
          const depletionPoint = chartData.find(point => Math.max(point.buyImpact, point.sellImpact) >= 5)
          return {
            chartData,
            marketDepth: rawData.marketDepth2pr || null,
            depletionThreshold: depletionPoint?.tradeSize || null,
            insights: buildInsights(chartData, depletionPoint?.tradeSize || null),
          }
        }
        return null
      }
      
      case 'Fees History': {
        if (rawData?.fees30d) {
          // Summary format - only KPI, no chart data
          return {
            totalFees30d: rawData.fees30d.usdValue,
            volume30d: rawData.volume30d?.usdValue || 0,
            chartData: null, // No chart data from summary
          }
        }
        if (rawData?.data && Array.isArray(rawData.data) && rawData.data.length > 0) {
          // Endpoint format - include all available fields
          const chartData = rawData.data.map((point: any) => {
            const feesUSD = parseFloat(point.feesUSD || '0')
            const volumeUSD = point.volumeUSD ? parseFloat(point.volumeUSD || '0') : undefined
            const feeEfficiency = volumeUSD && volumeUSD > 0 
              ? (feesUSD / volumeUSD) * 100 
              : undefined
            
          return {
              date: point.date,
              timestamp: point.timestamp,
              feesUSD,
              fees0: point.fees0 ? parseFloat(point.fees0) : undefined,
              fees1: point.fees1 ? parseFloat(point.fees1) : undefined,
              volumeUSD,
              volume0: point.volume0 ? parseFloat(point.volume0) : undefined,
              volume1: point.volume1 ? parseFloat(point.volume1) : undefined,
              feeEfficiency,
            }
          })
          
          // Check if all values are zero
          const allZeros = chartData.every((p: any) => 
            p.feesUSD === 0 && 
            (!p.volumeUSD || p.volumeUSD === 0)
          )
          
          if (allZeros) {
            console.warn('Fees history data contains all zeros:', {
              dataPoints: chartData.length,
              token0Symbol: rawData.token0Symbol,
              token1Symbol: rawData.token1Symbol,
            })
          }
          
          return {
            chartData,
            totalFees: parseFloat(rawData.totalFees || '0'),
            token0Symbol: rawData.token0Symbol || vaultDetails?.token0?.symbol || 'Token0',
            token1Symbol: rawData.token1Symbol || vaultDetails?.token1?.symbol || 'Token1',
            allZeros, // Flag to show warning in UI
          }
        }
        return null
      }
      
      case 'Live Inventory': {
        if (!rawData?.data?.tokens) return null
        return {
          token0: {
            symbol: rawData.data.tokens.token0.symbol,
            percentage: rawData.data.tokens.token0.percentage || 0,
            valueUSD: rawData.data.tokens.token0.valueUSD || 0,
          },
          token1: {
            symbol: rawData.data.tokens.token1.symbol,
            percentage: rawData.data.tokens.token1.percentage || 0,
            valueUSD: rawData.data.tokens.token1.valueUSD || 0,
          },
          totalValueUSD: rawData.data.totalValueUSD || 0,
          utilizationPercentage: rawData.data.utilizationPercentage || 0,
        }
      }
      
      default:
        return rawData
    }
  }

  // Extract data from summary if available
  const getApiData = (result: VaultTestResult, apiName: string): { data: any; status: ApiTestStatus; error?: ApiError } => {
    switch (apiName) {
      case 'Vault Details':
        return { data: result.vaultDetails.data, status: result.vaultDetails.status, error: result.vaultDetails.error }
      case 'Liquidity Profile':
        return { data: result.liquidityProfile.data, status: result.liquidityProfile.status, error: result.liquidityProfile.error }
      case 'Live Inventory':
        return { data: result.inventoryRatio.data, status: result.inventoryRatio.status, error: result.inventoryRatio.error }
      case 'Vault Balance':
        return { data: result.vaultBalance.data, status: result.vaultBalance.status, error: result.vaultBalance.error }
      case 'Price Impact': {
        // Use summary data if available, otherwise use dedicated endpoint
        if (result.vaultDetails.data?.summary?.priceImpact) {
          return { 
            data: result.vaultDetails.data.summary.priceImpact, 
            status: 'success' 
          }
        }
          return { 
          data: result.priceImpact?.data, 
          status: result.priceImpact?.status || 'loading', 
          error: result.priceImpact?.error 
        }
      }
      case 'Fees History': {
        // Always prefer endpoint data - summary often has null values
        return { data: result.feesHistory.data, status: result.feesHistory.status, error: result.feesHistory.error }
      }
      default:
        return { data: null, status: 'idle' }
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0909]">
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-black/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Data Dashboard</h1>
              <p className="text-sm text-white/50">
                Test API functions and verify data flow
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Overview Section */}
        {bulkTestResults.length > 0 && (
          <Card className="mb-8 border-[#EC9117]/30 bg-black/40">
            <CardHeader>
              <CardTitle className="text-xl">Available Vaults & Data</CardTitle>
              <CardDescription>
                All {TEST_VAULTS.length} test vaults and their available data endpoints
                {bulkTestResults.some(r => 
                  [r.vaultDetails?.status, r.liquidityProfile?.status, r.inventoryRatio?.status, 
                   r.vaultBalance?.status, r.priceImpact?.status, r.feesHistory?.status]
                    .some(s => s === 'error')
                ) && (
                  <span className="block mt-2 text-xs text-white/50">
                    Note: 400 errors come from the Arrakis Indexer API, indicating the vault may not support that endpoint or the data isn&apos;t available.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bulkTestResults.map((result, idx) => {
                  const allStatuses = [
                    result.vaultDetails?.status,
                    result.liquidityProfile?.status,
                    result.inventoryRatio?.status,
                    result.vaultBalance?.status,
                    result.priceImpact?.status,
                    result.feesHistory?.status,
                  ].filter(Boolean)
                  const successCount = allStatuses.filter(s => s === 'success').length
                  const errorCount = allStatuses.filter(s => s === 'error').length
                  const hasErrors = errorCount > 0

                  // Get token pair from any available source
                  const getTokenPair = () => {
                    if (result.vaultDetails.data?.token0?.symbol && result.vaultDetails.data?.token1?.symbol) {
                      return `${result.vaultDetails.data.token0.symbol} / ${result.vaultDetails.data.token1.symbol}`
                    }
                    if (result.liquidityProfile.data?.token0Symbol && result.liquidityProfile.data?.token1Symbol) {
                      return `${result.liquidityProfile.data.token0Symbol} / ${result.liquidityProfile.data.token1Symbol}`
                    }
                    if (result.inventoryRatio.data?.data?.tokens?.token0?.symbol && result.inventoryRatio.data?.data?.tokens?.token1?.symbol) {
                      return `${result.inventoryRatio.data.data.tokens.token0.symbol} / ${result.inventoryRatio.data.data.tokens.token1.symbol}`
                    }
                    if (result.feesHistory.data?.token0Symbol && result.feesHistory.data?.token1Symbol) {
                      return `${result.feesHistory.data.token0Symbol} / ${result.feesHistory.data.token1Symbol}`
                    }
                    return null
                  }

                  const tokenPair = getTokenPair()

                  return (
                    <div
                      key={`${result.vault.chainId}-${result.vault.address}`}
                      className={`p-4 rounded-lg border ${
                        hasErrors
                          ? 'border-destructive/30 bg-destructive/5'
                          : 'border-green-500/30 bg-green-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {tokenPair ? (
                              <h3 className="text-lg font-bold">
                                {tokenPair}
                              </h3>
                            ) : (
                              <h3 className="text-lg font-bold">
                                Loading...
                              </h3>
                            )}
                            {hasErrors && (
                              <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {errorCount} Error{errorCount > 1 ? 's' : ''}
                              </Badge>
                                <div className="text-xs text-white/50">
                                  {(() => {
                                    const failedApis = [
                                      result.vaultDetails?.status === 'error' && 'Vault Details',
                                      result.liquidityProfile?.status === 'error' && 'Liquidity',
                                      result.inventoryRatio?.status === 'error' && 'Inventory',
                                      result.vaultBalance?.status === 'error' && 'Balance',
                                      result.priceImpact?.status === 'error' && 'Price Impact',
                                      result.feesHistory?.status === 'error' && 'Fees History',
                                    ].filter(Boolean)
                                    return failedApis.length > 0 ? `(${failedApis.join(', ')})` : ''
                                  })()}
                                </div>
                              </div>
                            )}
                            {!hasErrors && (
                              <span className="text-xs text-white/50">All operational</span>
                            )}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getChainName(result.vault.chainId)}
                              </Badge>
                              <span className="text-xs text-white/50 font-mono">
                                {result.vault.address.slice(0, 6)}...{result.vault.address.slice(-4)}
                              </span>
                            </div>
                            {result.vaultDetails.data && (
                              <div className="mt-2">
                                {result.vaultDetails.data.name && result.vaultDetails.data.name !== result.vaultDetails.data.symbol && (
                                  <div className="font-semibold text-lg mb-1 text-white/50">
                                    {result.vaultDetails.data.name}
                                  </div>
                                )}
                                {result.vaultDetails.data.tvl && (
                                  <div className="text-[#EC9117] font-semibold text-lg">
                                    TVL: ${parseFloat(result.vaultDetails.data.tvl).toLocaleString()}
                                  </div>
                                )}
                                {result.vaultDetails.data.exchange && (
                                  <div className="text-xs text-white/50 mt-2">
                                    {result.vaultDetails.data.exchange}
                                    {result.vaultDetails.data.feeTier && ` • ${result.vaultDetails.data.feeTier}`}
                                  </div>
                                )}
                              </div>
                            )}
                            {!result.vaultDetails.data && (
                              <div className="text-white/50 text-xs">
                                Loading vault details...
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {successCount === 6 ? (
                            <div className="text-xs text-white/50">All operational</div>
                          ) : (
                            <div className="text-xs text-white/50">
                              {successCount}/6 available
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Available Data Endpoints */}
                      <div className="mt-4 pt-4 border-t border-white/[0.08]">
                        <div className="text-xs font-semibold text-white/50 mb-3 uppercase">
                          Available Data Endpoints
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
                          {[
                            {
                              name: 'Vault Details',
                              status: result.vaultDetails.status,
                              data: result.vaultDetails.data,
                              error: result.vaultDetails.error,
                              fields: result.vaultDetails.data ? [
                                'name', 'symbol', 'tvl', 'token0', 'token1', 'apr', 'feeTier', 'exchange'
                              ] : [],
                              chartType: 'Info Cards'
                            },
                            {
                              name: 'Liquidity Profile',
                              status: result.liquidityProfile.status,
                              data: result.liquidityProfile.data,
                              error: result.liquidityProfile.error,
                              fields: result.liquidityProfile.data ? [
                                `ticks (${result.liquidityProfile.data.ticks?.length || 0})`,
                                'currentPrice', 'currentTick', 'token0Symbol', 'token1Symbol'
                              ] : [],
                              chartType: 'Liquidity Distribution Chart'
                            },
                            {
                              name: 'Live Inventory',
                              status: result.inventoryRatio.status,
                              data: result.inventoryRatio.data,
                              error: result.inventoryRatio.error,
                              fields: result.inventoryRatio.data ? [
                                'totalValueUSD', 'utilizationPercentage',
                                'token0.percentage', 'token0.valueUSD',
                                'token1.percentage', 'token1.valueUSD'
                              ] : [],
                              chartType: 'Current Snapshot'
                            },
                            {
                              name: 'Vault Balance',
                              status: result.vaultBalance.status,
                              data: result.vaultBalance.data,
                              error: result.vaultBalance.error,
                              fields: result.vaultBalance.data ? [
                                `data points (${result.vaultBalance.data.data?.length || 0})`,
                                'timestamp', 'token0.percentage', 'token1.percentage',
                                'token0.valueUSD', 'token1.valueUSD'
                              ] : [],
                              chartType: 'Inventory Ratio Over Time'
                            },
                            {
                              name: 'Price Impact',
                              status: result.vaultDetails.data?.summary?.priceImpact ? 'success' : (result.priceImpact?.status || 'loading'),
                              data: result.vaultDetails.data?.summary?.priceImpact || result.priceImpact?.data,
                              error: result.priceImpact?.error,
                              fields: result.vaultDetails.data?.summary?.priceImpact ? [
                                'buy (1000, 2500, 5000, 10000, 25000, 50000, 100000)',
                                'sell (1000, 2500, 5000, 10000, 25000, 50000, 100000)',
                                'timeAt'
                              ] : result.priceImpact.data ? [
                                `data points (${result.priceImpact.data.data?.length || 0})`,
                                'tradeSize', 'priceImpactPercent', 'timestamp', 'direction'
                              ] : [],
                              chartType: 'Price Impact Chart',
                              source: result.vaultDetails.data?.summary?.priceImpact ? 'summary' : 'endpoint'
                            },
                            {
                              name: 'Fees History',
                              status: result.feesHistory.status,
                              data: result.feesHistory.data,
                              error: result.feesHistory.error,
                              fields: result.feesHistory.data ? [
                                `data points (${result.feesHistory.data.data?.length || 0})`,
                                'totalFees', 'feesUSD', 'fees0', 'fees1', 'date', 'timestamp'
                              ] : [],
                              chartType: 'Fees Over Time',
                              source: 'endpoint'
                            },
                          ].map((api, apiIdx) => {
                            const hasData = api.status === 'success' && (api.data || api.fields.length > 0)
                            return (
                            <button
                              key={apiIdx}
                              onClick={() => hasData && setSelectedCard({ vaultIdx: idx, apiName: api.name })}
                              disabled={!hasData}
                              className={`p-3 rounded border text-left transition-all ${
                                api.status === 'success'
                                  ? hasData 
                                    ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20 cursor-pointer'
                                    : 'bg-green-500/10 border-green-500/30 cursor-not-allowed opacity-50'
                                  : api.status === 'error'
                                  ? 'bg-destructive/10 border-destructive/30 cursor-not-allowed opacity-50'
                                  : 'bg-black/40 border-white/[0.08] cursor-not-allowed opacity-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {api.status === 'success' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                ) : api.status === 'error' ? (
                                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                                ) : (
                                  <div className="h-4 w-4 border border-slate-600 rounded flex-shrink-0" />
                                )}
                                <div className="text-xs font-semibold">{api.name}</div>
                              </div>
                              {api.status === 'success' && api.fields.length > 0 && (
                                <div className="text-xs text-white/50 space-y-1">
                                  <div className="font-medium text-white mb-1 text-[10px] uppercase">
                                    {api.chartType}
                                  </div>
                                  <div className="font-medium text-green-400 mb-1 text-[10px]">Fields:</div>
                                  {api.fields.slice(0, 4).map((field, fIdx) => (
                                    <div key={fIdx} className="pl-1 text-[10px]">
                                      • {field}
                                    </div>
                                  ))}
                                  {api.fields.length > 4 && (
                                    <div className="text-[10px] text-white/50">
                                      +{api.fields.length - 4} more
                                    </div>
                                  )}
                                </div>
                              )}
                              {api.status === 'error' && api.error && (
                                <div className="text-xs text-destructive">
                                  {api.error.statusCode}: {api.error.message}
                                  </div>
                                )}
                                {hasData && (
                                  <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                                    {api.source === 'summary' && (
                                      <Badge variant="outline" className="text-[10px]">
                                        From Summary
                                      </Badge>
                                    )}
                                    <ChevronRight className="h-3 w-3 ml-auto" />
                                  </div>
                                )}
                              </button>
                            )
                          })}
                          </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isBulkTesting && bulkTestResults.length === 0 && (
          <Card className="mb-8">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#EC9117]" />
                <div className="text-white/50">Loading all vault data...</div>
              </div>
            </CardContent>
          </Card>
        )}

      </main>

      {/* Data Detail Modal */}
      {selectedCard && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
        >
          <Card 
            className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex-shrink-0 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {(() => {
                      const result = bulkTestResults[selectedCard.vaultIdx]
                      if (!result) return 'Loading...'
                      // Use the same helper function as the main view
                      if (result.vaultDetails.data?.token0?.symbol && result.vaultDetails.data?.token1?.symbol) {
                        return `${result.vaultDetails.data.token0.symbol} / ${result.vaultDetails.data.token1.symbol}`
                      }
                      if (result.liquidityProfile.data?.token0Symbol && result.liquidityProfile.data?.token1Symbol) {
                        return `${result.liquidityProfile.data.token0Symbol} / ${result.liquidityProfile.data.token1Symbol}`
                      }
                      if (result.inventoryRatio.data?.data?.tokens?.token0?.symbol && result.inventoryRatio.data?.data?.tokens?.token1?.symbol) {
                        return `${result.inventoryRatio.data.data.tokens.token0.symbol} / ${result.inventoryRatio.data.data.tokens.token1.symbol}`
                      }
                      if (result.feesHistory.data?.token0Symbol && result.feesHistory.data?.token1Symbol) {
                        return `${result.feesHistory.data.token0Symbol} / ${result.feesHistory.data.token1Symbol}`
                      }
                      return 'Loading...'
                    })()}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {selectedCard.apiName} - {getChainName(bulkTestResults[selectedCard.vaultIdx]?.vault.chainId || 1)}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCard(null)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              {(() => {
                const result = bulkTestResults[selectedCard.vaultIdx]
                if (!result) return <div>Vault not found</div>

                const apiData = getApiData(result, selectedCard.apiName)

                if (apiData.status === 'loading') {
                  return (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-[#EC9117]" />
                    </div>
                  )
                }

                if (apiData.status === 'error') {
                  return (
                    <div className="space-y-4">
                      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-5 w-5 text-destructive" />
                          <h3 className="font-semibold text-destructive">Error</h3>
                        </div>
                        {apiData.error && (
                          <div className="space-y-1 text-sm">
                            <div><strong>Status:</strong> {apiData.error.statusCode}</div>
                            <div><strong>Message:</strong> {apiData.error.message}</div>
                            <div><strong>Error:</strong> {apiData.error.error}</div>
                          </div>
                        )}
                      </div>
                      {selectedCard.apiName === 'Price Impact' && result.vaultDetails.data?.summary?.priceImpact && (
                        <div className="p-4 bg-arrakis-orange/10 border border-arrakis-orange/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="h-5 w-5 text-[#EC9117]" />
                            <h3 className="font-semibold text-[#EC9117]">Data Available in Summary</h3>
                          </div>
                          <p className="text-sm text-white/50 mb-3">
                            The dedicated endpoint returned an error, but price impact data is available in the vault details summary.
                          </p>
                        </div>
                      )}
                      {selectedCard.apiName === 'Fees History' && result.feesHistory.status === 'error' && (
                        <div className="p-4 bg-arrakis-orange/10 border border-arrakis-orange/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="h-5 w-5 text-[#EC9117]" />
                            <h3 className="font-semibold text-[#EC9117]">Data Available in Summary</h3>
                          </div>
                          <p className="text-sm text-white/50 mb-3">
                            The dedicated endpoint returned an error, but fees data is available in the vault details summary.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                }

                if (apiData.data) {
                  // For Vault Details, show the full object including summary
                  const displayData = selectedCard.apiName === 'Vault Details' 
                    ? result.vaultDetails.data 
                    : apiData.data
                  
                  const transformedData = transformDataForCharts(selectedCard.apiName, displayData, result.vaultDetails.data)
                  
                  // Only show chart tab if transformation succeeded (no _error property)
                  const hasValidTransformation = transformedData && !transformedData._error
                  
                  // Show chart tab for APIs that support charts, even if transformation has errors
                  // (so we can show helpful error messages in the chart tab)
                  const showChartTab = selectedCard.apiName !== 'Vault Details' && (
                    selectedCard.apiName === 'Liquidity Profile' ||
                    selectedCard.apiName === 'Vault Balance' ||
                    selectedCard.apiName === 'Price Impact' ||
                    selectedCard.apiName === 'Fees History' ||
                    selectedCard.apiName === 'Live Inventory'
                  )

                  const copyToClipboard = async (text: string, tabName: string) => {
                    try {
                      await navigator.clipboard.writeText(text)
                      setCopiedTab(tabName)
                      setTimeout(() => setCopiedTab(null), 2000)
                    } catch (err) {
                      console.error('Failed to copy:', err)
                    }
                  }

                  return (
                    <div className="relative">
                      <Tabs defaultValue={showChartTab ? "transformed" : "raw"} className="w-full">
                        <TabsList className={`grid w-full ${showChartTab ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          {showChartTab && <TabsTrigger value="chart">Chart</TabsTrigger>}
                          <TabsTrigger value="transformed">Transformed</TabsTrigger>
                          <TabsTrigger value="raw">Raw</TabsTrigger>
                        </TabsList>
                      
                      <TabsContent value="transformed" className="mt-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <h3 className="font-semibold">Transformed Data (Ready for Charts)</h3>
                            </div>
                            {transformedData && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(JSON.stringify(transformedData, null, 2), 'transformed')}
                                className="flex items-center gap-2"
                              >
                                {copiedTab === 'transformed' ? (
                                  <>
                                    <Check className="h-4 w-4" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4" />
                                    Copy
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          {transformedData ? (
                            transformedData._error ? (
                              <div className="p-4 bg-black/40 rounded-lg border border-red-500/30">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-red-400">
                                    <AlertTriangle className="h-5 w-5" />
                                    <h4 className="font-semibold">Transformation Failed</h4>
                                  </div>
                                  <div className="text-sm text-slate-300 space-y-2">
                                    <div>
                                      <span className="text-slate-400">Reason: </span>
                                      <span className="font-mono text-red-300">{transformedData._error.reason}</span>
                                    </div>
                                    {transformedData._error.details && (
                                      <div className="mt-2">
                                        <span className="text-slate-400">Details: </span>
                                        <pre className="mt-1 p-2 bg-slate-950 rounded text-xs overflow-x-auto">
                                          {JSON.stringify(transformedData._error.details, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    <div className="mt-3 pt-3 border-t border-white/[0.08]">
                                      <p className="text-slate-400 text-xs mb-2">Raw data structure:</p>
                                      <pre className="text-xs overflow-x-auto max-h-[40vh] overflow-y-auto p-2 bg-slate-950 rounded">
                                        <code className="text-slate-500">
                                          {JSON.stringify(
                                            {
                                              hasCurrentPrice: !!transformedData._rawData?.currentPrice,
                                              currentPrice: transformedData._rawData?.currentPrice,
                                              hasDataArray: !!transformedData._rawData?.data,
                                              dataArrayLength: transformedData._rawData?.data?.length,
                                              hasTicksArray: !!transformedData._rawData?.ticks,
                                              ticksArrayLength: transformedData._rawData?.ticks?.length,
                                            },
                                            null,
                                            2
                                          )}
                                        </code>
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-black/40 rounded-lg border border-white/[0.08] relative">
                                <pre className="text-xs overflow-x-auto max-h-[60vh] overflow-y-auto">
                                  <code className="text-white">
                                    {JSON.stringify(transformedData, null, 2)}
                                  </code>
                                </pre>
                              </div>
                            )
                          ) : (
                            <div className="p-4 bg-black/40 rounded-lg border border-white/[0.08]">
                              <div className="text-center text-white/50 py-8">
                                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                                <p>No transformed data available.</p>
                                <p className="text-sm mt-1">Data transformation failed or data format is not supported.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="raw" className="mt-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Info className="h-5 w-5 text-white/50" />
                              <h3 className="font-semibold">Raw JSON Data</h3>
                              {(selectedCard.apiName === 'Price Impact' && result.vaultDetails.data?.summary?.priceImpact) && (
                                <Badge variant="outline" className="ml-2">
                                  From Summary
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(displayData, null, 2), 'raw')}
                              className="flex items-center gap-2"
                            >
                              {copiedTab === 'raw' ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="p-4 bg-black/40 rounded-lg border border-white/[0.08]">
                            <pre className="text-xs overflow-x-auto max-h-[60vh] overflow-y-auto">
                              <code className="text-green-400">
                                {JSON.stringify(displayData, null, 2)}
                              </code>
                            </pre>
                          </div>
                        </div>
                      </TabsContent>
                      
                      {showChartTab && (
                        <TabsContent value="chart" className="mt-4">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <CheckCircle2 className="h-5 w-5 text-[#EC9117]" />
                              <h3 className="font-semibold">Chart Visualization</h3>
                            </div>
                            {transformedData ? (
                              <div className="p-6 bg-black/40 rounded-lg border border-white/[0.08]">
                              {selectedCard.apiName === 'Liquidity Profile' && transformedData?.chartData ? (
                                <LiquidityDistributionChart
                                  chartData={transformedData.chartData}
                                  leftBound={transformedData.leftBound}
                                  rightBound={transformedData.rightBound}
                                  weightedCenter={transformedData.weightedCenter}
                                  currentPrice={
                                    (displayData && typeof displayData === 'object' && 'currentPrice' in displayData)
                                      ? (displayData as any).currentPrice
                                      : (result.liquidityProfile?.data && typeof result.liquidityProfile.data === 'object' && 'currentPrice' in result.liquidityProfile.data)
                                      ? (result.liquidityProfile.data as any).currentPrice
                                      : undefined
                                  }
                                  pairLabel={
                                    displayData?.token0Symbol && displayData?.token1Symbol
                                      ? `${displayData.token0Symbol} / ${displayData.token1Symbol}`
                                      : result.vaultDetails.data?.token0?.symbol && result.vaultDetails.data?.token1?.symbol
                                      ? `${result.vaultDetails.data.token0.symbol} / ${result.vaultDetails.data.token1.symbol}`
                                      : undefined
                                  }
                                />
                              ) : selectedCard.apiName === 'Liquidity Profile' ? (
                                <div className="text-center text-white/50 py-12">
                                  No liquidity data available for chart
                                </div>
                              ) : null}
                                {selectedCard.apiName === 'Vault Balance' && transformedData.chartData && Array.isArray(transformedData.chartData) && transformedData.chartData.length > 0 && (
                                  <InventoryRatioChart
                                    data={transformedData.chartData.map((item: any) => ({
                                      timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp),
                                      token0Percentage: item.token0Percentage,
                                      token1Percentage: item.token1Percentage,
                                      totalValueUSD: item.totalValueUSD,
                                    }))}
                                    token0Symbol={result.vaultDetails.data?.token0?.symbol || 'Token0'}
                                    token1Symbol={result.vaultDetails.data?.token1?.symbol || 'Token1'}
                                  />
                                )}
                              {selectedCard.apiName === 'Price Impact' && transformedData?.chartData && Array.isArray(transformedData.chartData) && transformedData.chartData.length > 0 && (
                                <PriceImpactChart
                                  data={transformedData.chartData}
                                  marketDepth={transformedData.marketDepth}
                                  depletionThreshold={transformedData.depletionThreshold}
                                  insights={transformedData.insights}
                                />
                              )}
                                {selectedCard.apiName === 'Fees History' && transformedData.chartData && Array.isArray(transformedData.chartData) && transformedData.chartData.length > 0 && (
                                  <FeesChart
                                    data={transformedData.chartData.map((item: any) => ({
                                      timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp),
                                      date: item.date,
                                      feesUSD: typeof item.feesUSD === 'number' ? item.feesUSD : parseFloat(item.feesUSD || '0'),
                                      fees0: item.fees0 !== undefined ? (typeof item.fees0 === 'number' ? item.fees0 : parseFloat(item.fees0)) : undefined,
                                      fees1: item.fees1 !== undefined ? (typeof item.fees1 === 'number' ? item.fees1 : parseFloat(item.fees1)) : undefined,
                                      volumeUSD: item.volumeUSD ? (typeof item.volumeUSD === 'number' ? item.volumeUSD : parseFloat(item.volumeUSD)) : undefined,
                                      volume0: item.volume0 !== undefined ? (typeof item.volume0 === 'number' ? item.volume0 : parseFloat(item.volume0)) : undefined,
                                      volume1: item.volume1 !== undefined ? (typeof item.volume1 === 'number' ? item.volume1 : parseFloat(item.volume1)) : undefined,
                                      feeEfficiency: item.feeEfficiency !== undefined ? (typeof item.feeEfficiency === 'number' ? item.feeEfficiency : parseFloat(item.feeEfficiency)) : undefined,
                                    }))}
                                    token0Symbol={transformedData.token0Symbol}
                                    token1Symbol={transformedData.token1Symbol}
                                  />
                                )}
                              {selectedCard.apiName === 'Live Inventory' && transformedData && (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-center gap-8">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-[#EC9117]">
                                        {transformedData.token0.percentage.toFixed(1)}%
                                      </div>
                                      <div className="text-sm text-white/50">{transformedData.token0.symbol}</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-white">
                                        {transformedData.token1.percentage.toFixed(1)}%
                                      </div>
                                      <div className="text-sm text-white/50">{transformedData.token1.symbol}</div>
                                    </div>
                                  </div>
                                  <div className="h-8 w-full rounded-full overflow-hidden flex">
                                    <div
                                      className="bg-arrakis-orange"
                                      style={{ width: `${transformedData.token0.percentage}%` }}
                                    />
                                    <div
                                      className="bg-arrakis-blue"
                                      style={{ width: `${transformedData.token1.percentage}%` }}
                                    />
                                  </div>
                                  <div className="text-center text-sm text-white/50">
                                    Total Value: ${transformedData.totalValueUSD.toLocaleString()}
                                  </div>
                                </div>
                              )}
                              {!['Liquidity Profile', 'Vault Balance', 'Price Impact', 'Fees History', 'Live Inventory'].includes(selectedCard.apiName) && (
                                <div className="text-center text-white/50 py-12">
                                  Chart visualization not available for this data type
                                </div>
                              )}
                              </div>
                            ) : (
                              <div className="text-center text-white/50 py-12">
                                No data available for chart
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      )}
                    </Tabs>
                  </div>
                )
              }

                return <div className="text-white/50">No data available</div>
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

