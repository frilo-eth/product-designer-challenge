/**
 * APR Calculation Utilities
 * 
 * APRs are calculated using the total liquidity in the pool versus the total reward amount.
 * Actual APRs may be higher as some liquidity is not staked or in-range.
 * APRs for individual positions may vary depending on the price range set.
 */

export interface APRCalculationInput {
  /** Total Value Locked (TVL) in USD */
  tvl: number
  /** Fees earned in the specified period in USD */
  feesEarned: number
  /** Period in days (e.g., 30 for 30-day fees) */
  periodDays: number
}

export interface APRResult {
  /** Calculated APR as a percentage (e.g., 15.5 for 15.5%) */
  apr: number
  /** Annualized fees in USD */
  annualizedFees: number
  /** Whether the APR is reliable (requires sufficient data) */
  isReliable: boolean
  /** Warning message if data quality is poor */
  warning?: string
}

/**
 * Calculate APR based on fees earned over a period
 * 
 * Formula: APR = (Fees / TVL) * (365 / Period) * 100
 * 
 * @param input - TVL, fees earned, and period
 * @returns APR result with percentage and reliability indicator
 */
export function calculateAPR(input: APRCalculationInput): APRResult | null {
  const { tvl, feesEarned, periodDays } = input

  // Validation: ensure we have positive values
  if (!tvl || tvl <= 0) {
    return null
  }

  if (!feesEarned || feesEarned < 0) {
    return null
  }

  if (!periodDays || periodDays <= 0) {
    return null
  }

  // Calculate annualized fees
  const annualizedFees = (feesEarned / periodDays) * 365

  // Calculate APR as a percentage
  const apr = (annualizedFees / tvl) * 100

  // Determine reliability
  // APR is considered reliable if:
  // 1. Period is at least 7 days
  // 2. Fees are significant relative to TVL (at least 0.01% over the period)
  // 3. APR is within a reasonable range (0.1% - 1000%)
  const isReliable = 
    periodDays >= 7 && 
    (feesEarned / tvl) >= 0.0001 && 
    apr >= 0.1 && 
    apr <= 1000

  let warning: string | undefined

  if (periodDays < 7) {
    warning = 'APR calculated from less than 7 days of data - may be volatile'
  } else if (apr > 500) {
    warning = 'Exceptionally high APR - verify data accuracy'
  } else if (apr < 0.1) {
    warning = 'Very low APR - vault may have minimal activity'
  } else if ((feesEarned / tvl) < 0.0001) {
    warning = 'Low fee generation relative to TVL - APR may not be representative'
  }

  return {
    apr,
    annualizedFees,
    isReliable,
    warning,
  }
}

/**
 * Format APR for display
 * 
 * @param apr - APR percentage
 * @returns Formatted string (e.g., "15.5%", "< 0.1%", "> 1000%")
 */
export function formatAPR(apr: number): string {
  if (apr < 0.1) {
    return '< 0.1%'
  }
  
  if (apr > 1000) {
    return '> 1,000%'
  }
  
  if (apr >= 100) {
    return `${apr.toFixed(0)}%`
  }
  
  if (apr >= 10) {
    return `${apr.toFixed(1)}%`
  }
  
  return `${apr.toFixed(2)}%`
}

/**
 * Calculate effective APR for in-range liquidity
 * 
 * Since only in-range liquidity earns fees, the effective APR for positioned
 * liquidity may be higher than the pool-wide APR.
 * 
 * @param poolAPR - Pool-wide APR
 * @param totalLiquidity - Total liquidity in the pool
 * @param inRangeLiquidity - Liquidity currently in range
 * @returns Effective APR for in-range positions
 */
export function calculateEffectiveAPR(
  poolAPR: number,
  totalLiquidity: number,
  inRangeLiquidity: number
): number | null {
  if (!totalLiquidity || totalLiquidity <= 0) {
    return null
  }

  if (!inRangeLiquidity || inRangeLiquidity <= 0) {
    return null
  }

  // If less than 100% of liquidity is in range, effective APR is higher
  const utilizationRatio = inRangeLiquidity / totalLiquidity

  if (utilizationRatio > 1) {
    // Data inconsistency - return pool APR
    return poolAPR
  }

  if (utilizationRatio < 0.01) {
    // Less than 1% in range - effective APR calculation is unreliable
    return null
  }

  // Effective APR = Pool APR / Utilization Ratio
  // Example: If only 50% of liquidity is in range, effective APR for those positions is 2x
  return poolAPR / utilizationRatio
}

