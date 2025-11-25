'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type {
  PriceImpactChartPoint,
  PriceImpactFlattenedPoint,
} from '@/lib/hooks/useChartData'
import { Card } from '@/components/ui/card'

// ============================================
// Design Tokens (from Figma)
// ============================================
const COLORS = {
  surface: '#171312',
  border: '#221C1B',
  wormbone: '#F5EBE5',
  muted: '#8E7571',
  sell: '#FF2056',
  buy: '#00BC7D',
  safeZone: 'rgba(245,235,229,0.05)',
  // Warning/limit colors for critical point tooltip
  warning: '#EC9117',
  warningSubtle: 'rgba(236, 145, 23, 0.24)',
}

// Trade sizes for data points (always $1K - $100K, this is the API data range)
const DATA_TRADE_SIZES = [1000, 2500, 6300, 15800, 39800, 100000]
// Threshold: if breaking point > 60% of max, extend the visual domain
const EXTEND_THRESHOLD_RATIO = 0.6
// Extended domain max for deep liquidity vaults
const EXTENDED_DOMAIN_MAX = 250000

// ============================================
// Formatters
// ============================================
const currencyCompactFormatter = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    const formatted = (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)
    return `$${formatted}K`
  }
  return `$${value.toLocaleString()}`
}

// ============================================
// Data Processing
// ============================================
// Extended chart point with optional "isLimit" flag for critical point
interface ExtendedChartPoint extends PriceImpactChartPoint {
  isLimit?: boolean
}

// Interpolate a value at a given trade size using log-scale
const interpolateAtTradeSize = (
  sorted: PriceImpactChartPoint[],
  target: number,
  key: 'buyImpact' | 'sellImpact'
): number => {
  const left = [...sorted].reverse().find(point => point.tradeSize <= target)
  const right = sorted.find(point => point.tradeSize >= target)

  if (!left && !right) return 0
  if (!left) return right![key]
  if (!right) return left[key]
  if (left.tradeSize === right.tradeSize) return left[key]

  const logLeft = Math.log10(left.tradeSize)
  const logRight = Math.log10(right.tradeSize)
  const logTarget = Math.log10(target)
  const ratio = (logTarget - logLeft) / (logRight - logLeft)
  return left[key] + (right[key] - left[key]) * ratio
}

// Extrapolate beyond the data range using the slope from last two points
const extrapolateAtTradeSize = (
  data: ExtendedChartPoint[],
  target: number,
  key: 'buyImpact' | 'sellImpact'
): number => {
  if (data.length < 2) return 0
  
  // Use the last two data points to calculate slope on log scale
  const lastTwo = data.slice(-2)
  const p1 = lastTwo[0]
  const p2 = lastTwo[1]
  
  const logX1 = Math.log10(p1.tradeSize)
  const logX2 = Math.log10(p2.tradeSize)
  const logTarget = Math.log10(target)
  
  // Calculate slope: how much impact increases per log unit of trade size
  const slope = (p2[key] - p1[key]) / (logX2 - logX1)
  
  // Extrapolate from the last point
  const extrapolated = p2[key] + slope * (logTarget - logX2)
  
  // Ensure we don't go negative
  return Math.max(0, extrapolated)
}

const ensureAxisPoints = (
  points: PriceImpactChartPoint[], 
  tradeSizes: number[],
  breakingPoint?: number | null
): ExtendedChartPoint[] => {
  if (!points.length) {
    return []
  }

  const sorted = [...points].sort((a, b) => a.tradeSize - b.tradeSize)

  // Start with the provided axis points
  const result: ExtendedChartPoint[] = tradeSizes.map(tradeSize => {
    const exact = sorted.find(point => point.tradeSize === tradeSize)
    if (exact) return { ...exact, isLimit: false }

    return {
      tradeSize,
      buyImpact: interpolateAtTradeSize(sorted, tradeSize, 'buyImpact'),
      sellImpact: interpolateAtTradeSize(sorted, tradeSize, 'sellImpact'),
      isLimit: false,
    }
  })

  // Add the breaking point as a special "limit" data point if it exists and isn't too close to existing points
  if (breakingPoint) {
    const minTick = tradeSizes[0]
    const maxTick = tradeSizes[tradeSizes.length - 1]
    
    if (breakingPoint >= minTick && breakingPoint <= maxTick) {
      // Check if breaking point is not too close to existing data points
      const isCloseToExisting = result.some(point => 
        Math.abs(point.tradeSize - breakingPoint) < breakingPoint * 0.08
      )
      
      if (!isCloseToExisting) {
        const limitPoint: ExtendedChartPoint = {
          tradeSize: breakingPoint,
          buyImpact: interpolateAtTradeSize(sorted, breakingPoint, 'buyImpact'),
          sellImpact: interpolateAtTradeSize(sorted, breakingPoint, 'sellImpact'),
          isLimit: true,
        }
        result.push(limitPoint)
        result.sort((a, b) => a.tradeSize - b.tradeSize)
      }
    }
  }

  return result
}

const normalizePriceImpactData = (
  data: PriceImpactChartPoint[] | PriceImpactFlattenedPoint[] | null
): PriceImpactChartPoint[] => {
  if (!data || data.length === 0) return []

  const first = data[0] as PriceImpactChartPoint | PriceImpactFlattenedPoint

  if ('buyImpact' in first) {
    return (data as PriceImpactChartPoint[]).map((point) => ({
      tradeSize: point.tradeSize,
      buyImpact: point.buyImpact,
      sellImpact: Math.abs(point.sellImpact),
    }))
  }

  const flattened = data as PriceImpactFlattenedPoint[]
  const grouped = new Map<number, PriceImpactChartPoint>()

  flattened.forEach((point) => {
    const tradeSize = point.tradeSize
    const existing = grouped.get(tradeSize) || {
      tradeSize,
      buyImpact: 0,
      sellImpact: 0,
    }

    if (point.direction === 'buy') {
      existing.buyImpact = point.impact
    } else {
      existing.sellImpact = Math.abs(point.impact)
    }

    grouped.set(tradeSize, existing)
  })

  return Array.from(grouped.values()).sort((a, b) => a.tradeSize - b.tradeSize)
}

// Default inefficiency threshold (in %)
const DEFAULT_INEFFICIENCY_THRESHOLD = 2

/**
 * Interpolate trade size where impact crosses a threshold
 * Uses log-scale interpolation for accuracy on the X-axis
 */
function findThresholdCrossing(
  points: PriceImpactChartPoint[],
  threshold: number,
  key: 'buyImpact' | 'sellImpact'
): number | null {
  const sorted = [...points].sort((a, b) => a.tradeSize - b.tradeSize)

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]

    const currentVal = current[key]
    const nextVal = next[key]

    // Check if threshold is crossed between these two points
    if (currentVal < threshold && nextVal >= threshold) {
      // Log-scale interpolation
      const logCurrent = Math.log10(current.tradeSize)
      const logNext = Math.log10(next.tradeSize)
      const ratio = (threshold - currentVal) / (nextVal - currentVal)
      const logCrossing = logCurrent + ratio * (logNext - logCurrent)
      return Math.pow(10, logCrossing)
    }
  }

  return null
}

// ============================================
// Component Props
// ============================================
interface PriceImpactCardProps {
  data: PriceImpactChartPoint[] | PriceImpactFlattenedPoint[] | null
  /** Inefficiency threshold in % (default: 2). This is the vault's tolerance for price impact. */
  inefficiencyThreshold?: number
}

// ============================================
// Main Component
// ============================================
export function PriceImpactCard({
  data,
  inefficiencyThreshold = DEFAULT_INEFFICIENCY_THRESHOLD,
}: PriceImpactCardProps) {
  const grouped = normalizePriceImpactData(data)

  // Process chart data
  const { prepared, yMax, breakingPoint, xAxisTicks, domainMax } = useMemo(() => {
    const dataMax = DATA_TRADE_SIZES[DATA_TRADE_SIZES.length - 1]
    
    if (grouped.length < 2) {
      return { prepared: [], yMax: 10, breakingPoint: null, xAxisTicks: DATA_TRADE_SIZES, domainMax: dataMax }
    }

    // Generate chart data at standard trade sizes (always $1K - $100K)
    const basicData = ensureAxisPoints(grouped, DATA_TRADE_SIZES)
    const maxImpact = Math.max(...basicData.map(point => Math.max(point.buyImpact, point.sellImpact)))

    // Dynamic Y-axis: round up to nearest whole percent, add ~20% headroom, min threshold
    const ceilMax = Math.ceil(maxImpact)
    const calculatedYMax = Math.max(inefficiencyThreshold, ceilMax + Math.max(1, Math.ceil(ceilMax * 0.2)))

    // Find where the worst impact (sell usually) crosses the threshold
    const sellCrossing = findThresholdCrossing(basicData, inefficiencyThreshold, 'sellImpact')
    const buyCrossing = findThresholdCrossing(basicData, inefficiencyThreshold, 'buyImpact')
    // Use whichever crosses first (smaller trade size)
    const crossing =
      sellCrossing && buyCrossing
        ? Math.min(sellCrossing, buyCrossing)
        : sellCrossing || buyCrossing

    // Determine if we need extended visual domain (for deep liquidity vaults)
    // If breaking point is > 60% of data max ($60K), extend domain to $250K for visual space
    const needsExtension = crossing && crossing > dataMax * EXTEND_THRESHOLD_RATIO
    const visualDomainMax = needsExtension ? EXTENDED_DOMAIN_MAX : dataMax

    // Include the breaking point as a data point with interpolated values
    let chartData = ensureAxisPoints(grouped, DATA_TRADE_SIZES, crossing)

    // If we need extended domain, extrapolate the curve beyond $100K to $250K
    if (needsExtension && chartData.length >= 2) {
      const extendedPoint: ExtendedChartPoint = {
        tradeSize: EXTENDED_DOMAIN_MAX,
        buyImpact: extrapolateAtTradeSize(chartData, EXTENDED_DOMAIN_MAX, 'buyImpact'),
        sellImpact: extrapolateAtTradeSize(chartData, EXTENDED_DOMAIN_MAX, 'sellImpact'),
        isLimit: false,
      }
      chartData = [...chartData, extendedPoint]
    }

    // Calculate X-axis ticks - use extended domain ticks if needed
    let ticks = needsExtension 
      ? [1000, 6300, 39800, 100000, 250000]  // Include $100K as endpoint marker
      : [...DATA_TRADE_SIZES]
    
    // Add breaking point tick if it's not too close to existing ticks
    if (crossing && crossing <= dataMax) {
      const isCloseToExisting = ticks.some(tick => Math.abs(tick - crossing) < tick * 0.2)
      if (!isCloseToExisting) {
        ticks.push(crossing)
        ticks.sort((a, b) => a - b)
      }
    }

    // Update Y-axis max to account for extrapolated values
    const finalMaxImpact = Math.max(...chartData.map(point => Math.max(point.buyImpact, point.sellImpact)))
    const finalCeilMax = Math.ceil(finalMaxImpact)
    const finalYMax = Math.max(inefficiencyThreshold, finalCeilMax + Math.max(1, Math.ceil(finalCeilMax * 0.2)))

    return {
      prepared: chartData,
      yMax: finalYMax,
      breakingPoint: crossing,
      xAxisTicks: ticks,
      domainMax: visualDomainMax,
    }
  }, [grouped, inefficiencyThreshold])

  // Empty state
  if (prepared.length < 2) {
    return (
      <Card className="h-[260px] bg-[#171312] border-[#221C1B] text-white rounded-[16px] p-3 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-0.5">
          <p className="text-[12px] leading-[14px] text-[#8E7571]">
            Trade size
          </p>
          <h3 className="text-base font-medium text-[#F5EBE5] leading-6">
            Price Impact
          </h3>
        </div>
        <div className="mt-3 flex-1 flex items-center justify-center">
          <p className="text-[12px] text-[#8E7571]">Price impact data is unavailable</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-[260px] bg-[#171312] border-[#221C1B] text-white rounded-[16px] p-3 overflow-hidden flex flex-col">
      {/* Header - matches Figma exactly */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-[12px] leading-[14px] text-[#8E7571]">
            Trade size
          </p>
          <h3 className="text-base font-medium text-[#F5EBE5] leading-6">
            Price Impact
          </h3>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-3 flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={prepared} 
            margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
          >
            {/* Horizontal threshold line with TradingView-style badge */}
            <ReferenceLine
              y={inefficiencyThreshold}
              stroke={COLORS.muted}
              strokeWidth={1}
              strokeDasharray="4 4"
              label={({ viewBox }) => {
                const { y, x } = viewBox as { x: number; y: number }
                // Badge dimensions
                const badgeWidth = 32
                const badgeHeight = 16
                // Center badge vertically with the threshold line (y is the line's y position)
                const badgeY = y - badgeHeight / 2
                // Position badge at left edge (x is start of chart area, so subtract Y-axis width)
                const badgeX = x - 32
                return (
                  <g>
                    {/* Badge background - perfectly centered vertically with the line */}
                    <rect
                      x={badgeX}
                      y={badgeY}
                      width={badgeWidth}
                      height={badgeHeight}
                      rx={4}
                      fill={COLORS.surface}
                      stroke={COLORS.border}
                      strokeWidth={1}
                    />
                    {/* Badge text - centered in badge */}
                    <text
                      x={badgeX + badgeWidth / 2}
                      y={badgeY + badgeHeight / 2 + 3}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={600}
                      fill={COLORS.wormbone}
                    >
                      {inefficiencyThreshold}%
                    </text>
                  </g>
                )
              }}
            />

            {/* Vertical Critical from line with badge */}
            {breakingPoint && (
              <ReferenceLine
                x={breakingPoint}
                stroke={COLORS.muted}
                strokeWidth={1}
                strokeDasharray="4 4"
                label={({ viewBox }) => {
                  const { x, y, height } = viewBox as { x: number; y: number; width: number; height: number }
                  // Badge dimensions
                  const badgeWidth = 40
                  const badgeHeight = 16
                  // Position badge at top of chart
                  const badgeY = y + 4
                  const badgeX = x - badgeWidth / 2
                  return (
                    <g>
                      {/* Badge background with tooltip area */}
                      <rect
                        x={badgeX}
                        y={badgeY}
                        width={badgeWidth}
                        height={badgeHeight}
                        rx={4}
                        fill={COLORS.surface}
                        stroke={COLORS.border}
                        strokeWidth={1}
                      >
                        <title>
                          Critical trade size: {currencyCompactFormatter(breakingPoint)}. This is the trade size where price impact crosses the {inefficiencyThreshold}% threshold.
                        </title>
                      </rect>
                      {/* Badge text */}
                      <text
                        x={badgeX + badgeWidth / 2}
                        y={badgeY + badgeHeight / 2 + 3}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fill={COLORS.wormbone}
                      >
                        {currencyCompactFormatter(breakingPoint)}
                      </text>
                    </g>
                  )
                }}
              />
            )}

            {/* Y-axis hidden - only threshold badge shows the key metric */}
            <YAxis
              orientation="left"
              tickLine={false}
              axisLine={false}
              domain={[0, yMax]}
              width={32}
              tick={false}
            />

            {/* X-axis at the bottom */}
            <XAxis
              dataKey="tradeSize"
              type="number"
              scale="log"
              ticks={xAxisTicks}
              domain={[DATA_TRADE_SIZES[0], domainMax]}
              allowDataOverflow={false}
              tickLine={false}
              axisLine={false}
              height={16}
              tick={({ x, y, payload }) => {
                const value = payload.value as number
                // Check if this tick is the breaking point (with tolerance for floating point comparison)
                const isBreakingPoint = breakingPoint && Math.abs(value - breakingPoint) < Math.max(value * 0.05, 100)
                return (
                  <g>
                    {/* Step indicator line at breaking point */}
                    {isBreakingPoint && (
                      <line
                        x1={x}
                        y1={y}
                        x2={x}
                        y2={y + 6}
                        stroke={COLORS.muted}
                        strokeWidth={1}
                      />
                    )}
                    <text 
                      x={x} 
                      y={y + 8} 
                      textAnchor="middle" 
                      fontSize={10}
                      fill={COLORS.muted}
                      style={{ letterSpacing: '-0.16px', textTransform: 'uppercase' }}
                    >
                      {currencyCompactFormatter(value)}
                    </text>
                  </g>
                )
              }}
            />

            <Tooltip
              cursor={false}
              content={<PriceImpactTooltip inefficiencyThreshold={inefficiencyThreshold} />}
            />

            {/* Sell line (red/pink) */}
            <Line
              type="monotone"
              dataKey="sellImpact"
              stroke={COLORS.sell}
              strokeWidth={2}
              dot={false}
              strokeLinecap="round"
              name="Sell"
              isAnimationActive={false}
            />

            {/* Buy line (green) */}
            <Line
              type="monotone"
              dataKey="buyImpact"
              stroke={COLORS.buy}
              strokeWidth={2}
              dot={false}
              strokeLinecap="round"
              name="Buy"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ============================================
// Tooltip Component
// ============================================
interface PriceImpactTooltipProps extends TooltipProps<ValueType, NameType> {
  inefficiencyThreshold?: number
}

function PriceImpactTooltip({ 
  active, 
  payload, 
  label, 
  inefficiencyThreshold = DEFAULT_INEFFICIENCY_THRESHOLD 
}: PriceImpactTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const current = payload[0].payload as ExtendedChartPoint
  const maxImpact = Math.max(current.buyImpact, current.sellImpact)
  const isCritical = maxImpact >= inefficiencyThreshold
  const isLimit = current.isLimit === true

  // Limit tooltip - at the breaking point
  if (isLimit) {
    return (
      <div className="rounded-lg border border-[#221C1B] bg-[#171312] px-2 py-2 flex flex-col gap-2 min-w-[120px]">
        {/* Header row: trade size + Limit badge */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-medium text-[#F5EBE5]">
            {currencyCompactFormatter(label as number)}
          </span>
          <span className="text-[10px] text-[#EC9117] bg-[rgba(236,145,23,0.24)] px-1.5 py-0.5 rounded font-medium">
            Limit
          </span>
        </div>

        {/* Data rows */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF2056]" />
              <span className="text-[12px] text-[#8E7571]">Sell</span>
            </div>
            <span className="text-[12px] font-medium text-[#F5EBE5] tabular-nums">
              {current.sellImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00BC7D]" />
              <span className="text-[12px] text-[#8E7571]">Buy</span>
            </div>
            <span className="text-[12px] font-medium text-[#F5EBE5] tabular-nums">
              {current.buyImpact.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Standard tooltip
  return (
    <div className="rounded-lg border border-[#221C1B] bg-[#171312] px-2 py-2 flex flex-col gap-2 min-w-[120px]">
      {/* Header row: trade size + status badge */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-[#8E7571]">
          {currencyCompactFormatter(label as number)}
        </span>
        {isCritical ? (
          <span className="text-[10px] text-[#FF2056] bg-[rgba(255,32,86,0.24)] px-1.5 py-0.5 rounded-full">
            Critical
          </span>
        ) : (
          <span className="text-[10px] text-[#00BC7D] bg-[rgba(0,188,125,0.24)] px-1.5 py-0.5 rounded-full">
            Safe
          </span>
        )}
      </div>

      {/* Data rows */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF2056]" />
            <span className="text-[12px] text-[#8E7571]">Sell</span>
          </div>
          <span className="text-[12px] font-medium text-[#F5EBE5] tabular-nums">
            {current.sellImpact.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00BC7D]" />
            <span className="text-[12px] text-[#8E7571]">Buy</span>
          </div>
          <span className="text-[12px] font-medium text-[#F5EBE5] tabular-nums">
            {current.buyImpact.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}
