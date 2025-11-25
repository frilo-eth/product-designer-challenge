/**
 * Liquidity Band Classification Utility
 * 
 * Correctly classifies liquidity points based on liquidity thresholds,
 * not percentage distance from current price.
 */

import type { LiquidityBand } from '@/lib/transformLiquidityProfile'

export interface LiquidityPoint {
  pct: number
  liquidity: number
  band: LiquidityBand
}

/**
 * Classifies liquidity points into bands based on liquidity thresholds
 * 
 * @param points - Array of liquidity points with pct and liquidity
 * @returns Array of points with band classification
 */
export function classifyLiquidityBands(points: Array<{ pct: number; liquidity: number }>): LiquidityPoint[] {
  if (points.length === 0) return []

  // Calculate max liquidity for threshold comparison
  const maxLiquidity = Math.max(...points.map(p => p.liquidity))
  
  if (maxLiquidity === 0) {
    // All zero liquidity - classify all as sparse
    return points.map(p => ({ ...p, band: 'sparse' as LiquidityBand }))
  }

  // Classify based on liquidity thresholds relative to max
  // 'efficient' = within ±1% of price (high liquidity)
  // 'moderate' = within ±5% (medium liquidity)
  // 'sparse' = everything else (low liquidity)
  return points.map((point) => {
    const liquidityRatio = point.liquidity / maxLiquidity
    
    let band: LiquidityBand
    if (liquidityRatio >= 0.75) {
      band = 'efficient'
    } else if (liquidityRatio >= 0.25) {
      band = 'moderate'
    } else {
      band = 'sparse'
    }

    return {
      ...point,
      band,
    }
  })
}

