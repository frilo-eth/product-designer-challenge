/**
 * React hooks for transforming API data into chart-ready formats
 */

import { useMemo } from 'react'
import type {
  LiquidityProfile,
  VaultBalanceResponse,
  PriceImpactResponse,
  FeesHistoryResponse,
  LiveInventoryResponse,
  VaultMetadata,
  VaultSummary,
} from '../types'

// ============================================
// Liquidity Distribution Chart
// ============================================

export interface LiquidityChartPoint {
  relativePct: number
  liquidity: number
}

export function useLiquidityChartData(
  liquidityProfile: LiquidityProfile | null | undefined
): LiquidityChartPoint[] | null {
  return useMemo(() => {
    if (!liquidityProfile?.ticks || liquidityProfile.ticks.length === 0) {
      return null
    }

    const currentPrice = parseFloat(liquidityProfile.currentPrice || '0')
    if (currentPrice === 0) return null

    // Calculate relative percentage from current price for each tick
    const chartData: LiquidityChartPoint[] = liquidityProfile.ticks.map((tick) => {
      const tickPrice = parseFloat(tick.price0 || '0')
      const relativePct = tickPrice > 0 ? ((tickPrice - currentPrice) / currentPrice) * 100 : 0
      const liquidity = parseFloat(tick.liquidityGross || '0')

      return {
        relativePct,
        liquidity,
      }
    })

    // Sort by relativePct for proper chart rendering
    return chartData.sort((a, b) => a.relativePct - b.relativePct)
  }, [liquidityProfile])
}

// ============================================
// Inventory Ratio Over Time Chart
// ============================================

export interface InventoryRatioPoint {
  timestamp: Date
  token0Percentage: number
  token1Percentage: number
  totalValueUSD: number
}

export type Timeframe = '24h' | '1W' | '1M'

export function useInventoryRatioChartData(
  balanceHistory: VaultBalanceResponse | null | undefined,
  timeframe: Timeframe = '1M'
): InventoryRatioPoint[] {
  return useMemo(() => {
    if (!balanceHistory?.data || balanceHistory.data.length === 0) {
      return []
    }

    const now = new Date()
    const cutoffDate = new Date()

    switch (timeframe) {
      case '24h':
        cutoffDate.setHours(now.getHours() - 24)
        break
      case '1W':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case '1M':
        cutoffDate.setDate(now.getDate() - 30)
        break
    }

    return balanceHistory.data
      .filter((point) => new Date(point.timestamp) >= cutoffDate)
      .map((point) => ({
        timestamp: new Date(point.timestamp),
        token0Percentage: point.tokens.token0.percentage,
        token1Percentage: point.tokens.token1.percentage,
        totalValueUSD: point.totalValueUSD,
      }))
  }, [balanceHistory, timeframe])
}

// ============================================
// Price Impact Chart
// ============================================

export interface PriceImpactChartPoint {
  tradeSize: number
  buyImpact: number
  sellImpact: number
  efficiencyZone?: 'efficient' | 'warning' | 'critical'
}

export interface PriceImpactFlattenedPoint {
  tradeSize: number
  impact: number
  direction: 'buy' | 'sell'
}

export function usePriceImpactChartData(
  priceImpact: PriceImpactResponse | null | undefined,
  summaryPriceImpact?: VaultSummary['priceImpact']
): PriceImpactChartPoint[] | PriceImpactFlattenedPoint[] | null {
  return useMemo(() => {
    // Prefer summary data if available (from vault details)
    if (summaryPriceImpact?.buy && summaryPriceImpact?.sell) {
      const buyEntries = Object.entries(summaryPriceImpact.buy)
      const sellEntries = Object.entries(summaryPriceImpact.sell)

      // Grouped format: { tradeSize, buyImpact, sellImpact }
      const tradeSizes = new Set([
        ...buyEntries.map(([size]) => parseFloat(size)),
        ...sellEntries.map(([size]) => parseFloat(size)),
      ])

      return Array.from(tradeSizes)
        .sort((a, b) => a - b)
        .map((tradeSize) => ({
          tradeSize,
          buyImpact: summaryPriceImpact.buy?.[tradeSize.toString()] || 0,
          sellImpact: Math.abs(summaryPriceImpact.sell?.[tradeSize.toString()] || 0),
          efficiencyZone: (() => {
            const impact = Math.max(
              summaryPriceImpact.buy?.[tradeSize.toString()] || 0,
              Math.abs(summaryPriceImpact.sell?.[tradeSize.toString()] || 0)
            )
            if (impact < 2) return 'efficient'
            if (impact < 5) return 'warning'
            return 'critical'
          })(),
        }))
    }

    // Fallback to endpoint data
    if (priceImpact?.data && priceImpact.data.length > 0) {
      // Flattened format: { tradeSize, impact, direction }
      return priceImpact.data.map((point) => ({
        tradeSize: parseFloat(point.tradeSize || '0'),
        impact: Math.abs(point.priceImpactPercent || 0),
        direction: point.direction,
      }))
    }

    return null
  }, [priceImpact, summaryPriceImpact])
}

// ============================================
// Fees Over Time Chart
// ============================================

export interface FeesChartPoint {
  timestamp: Date
  date: string
  feesUSD: number
  fees0?: number
  fees1?: number
  volumeUSD?: number
  volume0?: number
  volume1?: number
  feeEfficiency?: number // feesUSD / volumeUSD ratio
}

export function useFeesChartData(
  feesHistory: FeesHistoryResponse | null | undefined,
  _summaryFees30d?: VaultSummary['fees30d'] // Reserved for potential fallback display
): FeesChartPoint[] | null {
  return useMemo(() => {
    // Use fees history endpoint if available
    if (feesHistory?.data && feesHistory.data.length > 0) {
      return feesHistory.data.map((point) => {
        const feesUSD = parseFloat(point.feesUSD || '0')
        const volumeUSD = point.volumeUSD ? parseFloat(point.volumeUSD) : undefined
        // Handle both string and number formats
        const fees0 = point.fees0 !== undefined && point.fees0 !== null 
          ? (typeof point.fees0 === 'string' ? parseFloat(point.fees0) : point.fees0)
          : undefined
        const fees1 = point.fees1 !== undefined && point.fees1 !== null
          ? (typeof point.fees1 === 'string' ? parseFloat(point.fees1) : point.fees1)
          : undefined
        const volume0 = point.volume0 ? (typeof point.volume0 === 'string' ? parseFloat(point.volume0) : point.volume0) : undefined
        const volume1 = point.volume1 ? (typeof point.volume1 === 'string' ? parseFloat(point.volume1) : point.volume1) : undefined
        
        // Calculate fee efficiency (fee rate as percentage)
        const feeEfficiency = volumeUSD && volumeUSD > 0 
          ? (feesUSD / volumeUSD) * 100 
          : undefined

        return {
        timestamp: new Date(point.timestamp),
        date: point.date,
          feesUSD,
          fees0,
          fees1,
          volumeUSD,
          volume0,
          volume1,
          feeEfficiency,
        }
      })
    }

    // If only summary available, return null (can't chart single point)
    // Note: summaryFees30d could be used as fallback but currently we just return null
    return null
  }, [feesHistory])
}

// ============================================
// KPI Calculations
// ============================================

export interface VaultKPIs {
  tvl: number
  token0Percentage: number
  token1Percentage: number
  drift24h: number
  priceImpact5k: number
  priceImpact10k: number
  priceImpact25k: number
  fees30d: number
  volume30d: number
  utilizationPercentage: number
}

export function useVaultKPIs(
  inventory: LiveInventoryResponse | null | undefined,
  balanceHistory: VaultBalanceResponse | null | undefined,
  priceImpactSummary: VaultSummary['priceImpact'],
  feesSummary: VaultSummary['fees30d'],
  volumeSummary: VaultSummary['volume30d']
): VaultKPIs | null {
  return useMemo(() => {
    if (!inventory?.data) return null

    // Calculate 24h drift
    let drift24h = 0
    if (balanceHistory?.data && balanceHistory.data.length >= 2) {
      const latest = balanceHistory.data[balanceHistory.data.length - 1]
      const previous = balanceHistory.data[balanceHistory.data.length - 2]
      const latestRatio = latest.tokens.token0.percentage
      const previousRatio = previous.tokens.token0.percentage
      drift24h = latestRatio - previousRatio
    }

    // Extract price impact KPIs
    const priceImpact5k = priceImpactSummary?.buy?.['5000'] || 0
    const priceImpact10k = priceImpactSummary?.buy?.['10000'] || 0
    const priceImpact25k = priceImpactSummary?.buy?.['25000'] || 0

    return {
      tvl: inventory.data.totalValueUSD,
      token0Percentage: inventory.data.tokens.token0.percentage,
      token1Percentage: inventory.data.tokens.token1.percentage,
      drift24h,
      priceImpact5k,
      priceImpact10k,
      priceImpact25k,
      fees30d: feesSummary?.usdValue || 0,
      volume30d: volumeSummary?.usdValue || 0,
      utilizationPercentage: inventory.data.utilizationPercentage,
    }
  }, [inventory, balanceHistory, priceImpactSummary, feesSummary, volumeSummary])
}

