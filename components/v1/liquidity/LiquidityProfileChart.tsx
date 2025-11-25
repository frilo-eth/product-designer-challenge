'use client'

import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import type { LiquidityPoint } from '@/lib/transformLiquidityProfile'

interface LiquidityProfileChartProps {
  chartData: LiquidityPoint[]
  leftBound: number
  rightBound: number
  weightedCenter: number
  currentPrice: number
  token0Symbol?: string
  token1Symbol?: string
  currentTick?: number
  // Optional: Use inventory data to calculate correct price if API price is wrong
  token0Amount?: string
  token1Amount?: string
  token0Decimals?: number
  token1Decimals?: number
}

const formatShortNumber = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

const formatPercentage = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(0)}%`
}

// Enhanced tooltip with price information (price first, then % in parentheses)
const CustomTooltip = ({ active, payload, label, currentPrice }: any) => {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0].payload as LiquidityPoint
  
  // Calculate actual price at this point
  const actualPrice = currentPrice * (1 + point.pct / 100)
  
  // Format liquidity as USD (assuming values are already scaled to USD)
  const liquidityValue = point.liquidity >= 1_000_000 
    ? `$${(point.liquidity / 1_000_000).toFixed(2)}M`
    : point.liquidity >= 1_000
    ? `$${(point.liquidity / 1_000).toFixed(2)}K`
    : `$${point.liquidity.toFixed(2)}`

  return (
    <div className="rounded-md border border-white/[0.12] bg-black/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-sm">
      <div className="text-white mb-1 font-medium">Price: ${actualPrice.toFixed(6)} ({formatPercentage(point.pct)})</div>
      <div className="text-white/60 mb-1">Liquidity: {liquidityValue}</div>
    </div>
  )
}

export function LiquidityProfileChart({
  chartData,
  leftBound,
  rightBound,
  weightedCenter,
  currentPrice,
  token0Symbol = 'Token0',
  token1Symbol = 'Token1',
  currentTick,
  token0Amount,
  token1Amount,
  token0Decimals,
  token1Decimals,
}: LiquidityProfileChartProps) {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-neutral-300">
        Liquidity profile data unavailable.
      </div>
    )
  }

  const sortedData = [...chartData].sort((a, b) => a.pct - b.pct)

  const MAX_BARS = 20
  const displayData =
    sortedData.length > MAX_BARS
      ? Array.from({ length: MAX_BARS }, (_, i) => {
          const ratio = i / (MAX_BARS - 1)
          const index = Math.min(
            Math.round(ratio * (sortedData.length - 1)),
            sortedData.length - 1
          )
          return sortedData[index]
        })
      : sortedData

  const maxLiquidity = Math.max(...sortedData.map(point => point.liquidity))
  const yMax = maxLiquidity * 1.15 || 1

  // Calculate data range for bands
  const dataMin = Math.min(...sortedData.map(p => p.pct))
  const dataMax = Math.max(...sortedData.map(p => p.pct))

  // ZOOM OUT AGGRESSIVELY: Show the FULL liquidity range with generous buffer
  // Use leftBound/rightBound as the base (these are where liquidity actually exists)
  // Add a large buffer (15% on each side) to ensure we see where liquidity ends
  const bufferPercent = 15 // 15% buffer on each side - AGGRESSIVE zoom out
  
  // Start with the bounds (these are the REAL edges where liquidity > 0)
  let xDomainMin = leftBound - bufferPercent
  let xDomainMax = rightBound + bufferPercent
  
  // Also consider the actual histogram data range (in case it extends beyond bounds)
  xDomainMin = Math.min(xDomainMin, dataMin - bufferPercent)
  xDomainMax = Math.max(xDomainMax, dataMax + bufferPercent)
  
  // Ensure 0% is always visible
  if (xDomainMin > 0) {
    xDomainMin = Math.min(0, xDomainMin)
  }
  if (xDomainMax < 0) {
    xDomainMax = Math.max(0, xDomainMax)
  }
  
  // EXTRA SAFETY: Ensure we show at least 20% beyond the bounds on each side
  // This guarantees we see where liquidity ends
  const extraBuffer = 20
  xDomainMin = Math.min(xDomainMin, leftBound - extraBuffer)
  xDomainMax = Math.max(xDomainMax, rightBound + extraBuffer)

  // Check if current price (0%) is within active range
  const isInActiveRange = 0 >= leftBound && 0 <= rightBound
  
  // Calculate price conversions (Uniswap style)
  // The API's currentPrice appears to be token0/token1 (e.g., ETH/MORPHO)
  // But it seems incorrect (shows 2787.437 when it should be ~1861.65)
  // User expects: 1 ETH = 1861.65 MORPHO (where ETH is token0, MORPHO is token1)
  //
  // Calculate price conversions (Uniswap style)
  // The API's currentPrice format is inconsistent - it can be either token0/token1 or token1/token0
  // Strategy: Try both interpretations and use inventory amounts to determine which is correct
  let priceToken0ToToken1: number
  let priceToken1ToToken0: number
  
  // First, try to calculate correct price from inventory amounts (most reliable)
  if (token0Amount && token1Amount && token0Decimals !== undefined && token1Decimals !== undefined) {
    const amount0Raw = parseFloat(token0Amount)
    const amount1Raw = parseFloat(token1Amount)
    if (amount0Raw > 0 && amount1Raw > 0) {
      const amount0 = amount0Raw / Math.pow(10, token0Decimals)
      const amount1 = amount1Raw / Math.pow(10, token1Decimals)
      // Calculate price from amounts: priceToken0ToToken1 = amount1 / amount0
      // This gives us "1 token0 = X token1" based on actual pool balances
      priceToken0ToToken1 = amount1 / amount0
      priceToken1ToToken0 = amount0 / amount1
    } else {
      // Fallback to API price if amounts are zero
      priceToken0ToToken1 = currentPrice
      priceToken1ToToken0 = currentPrice > 0 ? (1 / currentPrice) : 0
    }
  } else {
    // No inventory data, use API price directly
    // Assume API price is token0/token1 (standard Uniswap format)
    priceToken0ToToken1 = currentPrice
    priceToken1ToToken0 = currentPrice > 0 ? (1 / currentPrice) : 0
  }
  
  // Format price conversions with appropriate precision
  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 })
    if (price >= 1) return price.toFixed(2)
    if (price >= 0.01) return price.toFixed(4)
    if (price >= 0.0001) return price.toFixed(6)
    return price.toExponential(2)
  }

  return (
    <div className="w-full bg-black">
      {/* Price Header - Dynamic with token symbols and active range */}
      <div className="mb-4 px-2 space-y-2.5">
        {/* Price conversions - better spacing and larger text */}
        {/* NOTE: Only show token-to-token prices, NO USD values */}
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div className="text-sm text-white/90">
            <span className="font-medium">1 {token0Symbol}</span>
            <span className="text-white/40 mx-1.5">=</span>
            <span className="font-medium">{formatPrice(priceToken0ToToken1)}</span>
            <span className="text-white/60 ml-1">{token1Symbol}</span>
          </div>
          <div className="text-sm text-white/90">
            <span className="font-medium">1 {token1Symbol}</span>
            <span className="text-white/40 mx-1.5">=</span>
            <span className="font-medium">{formatPrice(priceToken1ToToken0)}</span>
            <span className="text-white/60 ml-1">{token0Symbol}</span>
          </div>
        </div>
        
        {/* Active range info - separate line with better visual hierarchy */}
        {isInActiveRange && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#EC9117] uppercase tracking-wide">Active Range</span>
              <span className="text-sm text-white font-medium">
                {leftBound.toFixed(1)}% → {rightBound.toFixed(1)}%
              </span>
            </div>
            {currentTick !== undefined && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="text-white/30">•</span>
                <span>Tick {currentTick}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="h-[400px] rounded-lg border border-white/[0.06] bg-black p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            margin={{ left: 0, right: 0, top: 10, bottom: 10 }}
            barCategoryGap={displayData.length >= 15 ? 6 : 18}
            barGap={2}
          >
            <defs>
              <linearGradient id="liq-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />

            {/* Risk Bands with gradients - rendered behind chart */}
            {/* Efficient zone ±1% - subtle highlight */}
            <ReferenceArea
              x1={Math.max(dataMin, -1)}
              x2={Math.min(dataMax, 1)}
              fill="rgba(255,255,255,0.04)"
              stroke="none"
            />
            {/* Moderate zone ±2% */}
            <ReferenceArea
              x1={Math.max(dataMin, -2)}
              x2={Math.min(dataMax, -1)}
              fill="rgba(255,255,255,0.02)"
              stroke="none"
            />
            <ReferenceArea
              x1={Math.max(dataMin, 1)}
              x2={Math.min(dataMax, 2)}
              fill="rgba(255,255,255,0.02)"
              stroke="none"
            />
            <ReferenceArea
              x1={Math.max(dataMin, -5)}
              x2={Math.min(dataMax, -2)}
              fill="rgba(255,255,255,0.015)"
              stroke="none"
            />
            <ReferenceArea
              x1={Math.max(dataMin, 2)}
              x2={Math.min(dataMax, 5)}
              fill="rgba(255,255,255,0.015)"
              stroke="none"
            />
            {dataMin < -5 && (
              <ReferenceArea
                x1={dataMin}
                x2={-5}
                fill="rgba(255,255,255,0.01)"
                stroke="none"
              />
            )}
            {dataMax > 5 && (
              <ReferenceArea
                x1={5}
                x2={dataMax}
                fill="rgba(255,255,255,0.01)"
                stroke="none"
              />
            )}

            <ReferenceLine
              x={0}
              stroke="#EC9117"
              strokeWidth={3}
              strokeDasharray="0"
              label={{
                value: `Current`,
                position: 'top',
                fill: '#EC9117',
                fontSize: 11,
                fontWeight: 700,
              }}
              isFront={true}
            />

            <ReferenceLine
              x={leftBound}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{
                value: formatPercentage(leftBound),
                position: 'top',
                fill: 'rgba(255,255,255,0.6)',
                fontSize: 9,
                opacity: 0.9,
              }}
            />
            <ReferenceLine
              x={rightBound}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{
                value: formatPercentage(rightBound),
                position: 'top',
                fill: 'rgba(255,255,255,0.6)',
                fontSize: 9,
                opacity: 0.9,
              }}
            />

            <ReferenceLine
              x={weightedCenter}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              label={{
                value: `Skew ${formatPercentage(weightedCenter)}`,
                position: 'top',
                fill: 'rgba(255,255,255,0.5)',
                fontSize: 9,
                opacity: 0.9,
              }}
            />

            <XAxis
              dataKey="pct"
              type="number"
              scale="linear"
              tickFormatter={formatPercentage}
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.3)"
              domain={[xDomainMin, xDomainMax]}
              allowDataOverflow={true}
            />

            <YAxis
              tickFormatter={formatShortNumber}
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.3)"
              domain={[0, yMax]}
            />

            <RechartsTooltip content={<CustomTooltip currentPrice={currentPrice} />} />

            <Bar dataKey="liquidity" radius={[0, 0, 0, 0]} fill="url(#liq-fill)" barSize={9}>
              {displayData.map((entry, index) => {
                const isCurrentPrice = Math.abs(entry.pct) < 0.1
                const opacity = isCurrentPrice ? 1 : entry.liquidity > 0 ? 0.7 : 0.3
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isCurrentPrice ? '#EC9117' : 'rgba(255,255,255,0.8)'}
                    opacity={opacity}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

