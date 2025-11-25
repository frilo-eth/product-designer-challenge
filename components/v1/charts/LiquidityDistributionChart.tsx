'use client'

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LiquidityPoint } from '@/lib/transformLiquidityProfile'

interface LiquidityDistributionChartProps {
  chartData: LiquidityPoint[]
  leftBound: number
  rightBound: number
  weightedCenter: number
  currentPrice?: number
  pairLabel?: string
}

const formatShortNumber = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(0)
}

const formatPrice = (price?: number) => {
  if (!price) return 'N/A'
  if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${price.toFixed(6)}`
}

const formatPercentage = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(0)}%`
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0].payload as LiquidityPoint
  const bandColors: Record<string, string> = {
    efficient: '#3BE38B',
    moderate: '#F3C14F',
    sparse: '#8E7571',
    warning: '#F3C14F', // Legacy fallback
    critical: '#FF5C5C', // Legacy fallback
  }
  const bandLabels: Record<string, string> = {
    efficient: 'Efficient',
    moderate: 'Moderate',
    sparse: 'Sparse',
    warning: 'Warning', // Legacy fallback
    critical: 'Critical', // Legacy fallback
  }

  return (
    <div className="rounded-md border border-white/10 bg-[#0E1016] px-3 py-2 text-xs shadow-lg">
      <div className="text-white/85 mb-1">Price: {formatPercentage(point.pct)}</div>
      <div className="text-white/65 mb-1">Liquidity: {point.liquidity.toLocaleString()}</div>
      <div className="flex items-center gap-2">
        <span className="text-white/40">Band:</span>
        <span
          className="font-medium"
          style={{ color: bandColors[point.band] }}
        >
          {bandLabels[point.band]}
        </span>
      </div>
    </div>
  )
}


export function LiquidityDistributionChart({
  chartData,
  leftBound,
  rightBound,
  weightedCenter,
  currentPrice,
  pairLabel,
}: LiquidityDistributionChartProps) {
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="border-white/6 bg-[#11131A]">
        <CardContent className="py-10 text-center text-sm text-white/40">
          Liquidity profile data unavailable.
        </CardContent>
      </Card>
    )
  }

  const sortedData = [...chartData].sort((a, b) => a.pct - b.pct)
  
  // Filter out zero liquidity points for statistics
  const meaningfulData = sortedData.filter(point => point.liquidity > 0)
  const maxLiquidity = meaningfulData.length > 0 
    ? Math.max(...meaningfulData.map(point => point.liquidity))
    : Math.max(...sortedData.map(point => point.liquidity)) || 1
  const yMax = maxLiquidity * 1.15 || 1

  // Use weightedCenter as the price line position (0% = current price)
  const priceLinePosition = 0

  return (
    <Card className="rounded-lg border border-white/6 bg-[#11131A] text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white/85">Liquidity Distribution (%)</CardTitle>
        {currentPrice !== undefined && (
          <p className="text-sm text-white/65 mt-1">Current Price: {formatPrice(currentPrice)}</p>
        )}
        {pairLabel && (
          <p className="text-xs text-white/40 mt-1">{pairLabel}</p>
        )}
      </CardHeader>
      <CardContent>
        <div
          className="h-[360px] rounded-lg border border-white/6 p-3"
          style={{ backgroundColor: '#0D0F15' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sortedData}
              margin={{ left: 0, right: 0, top: 10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="liquidityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

              {/* Vertical semantic bands for quick understanding */}
              {/* Critical zones (far from price) - red tint */}
              <ReferenceArea 
                x1={Math.min(leftBound, -15)} 
                x2={-15} 
                fill="rgba(255, 92, 92, 0.08)" 
                stroke="none"
              />
              <ReferenceArea 
                x1={15} 
                x2={Math.max(rightBound, 15)} 
                fill="rgba(255, 92, 92, 0.08)" 
                stroke="none"
              />
              
              {/* Warning zones (moderate distance) - yellow tint */}
              <ReferenceArea 
                x1={-15} 
                x2={-5} 
                fill="rgba(243, 193, 79, 0.1)" 
                stroke="none"
              />
              <ReferenceArea 
                x1={5} 
                x2={15} 
                fill="rgba(243, 193, 79, 0.1)" 
                stroke="none"
              />
              
              {/* Efficient zone (near price) - green tint */}
              <ReferenceArea 
                x1={-5} 
                x2={5} 
                fill="rgba(59, 227, 139, 0.12)" 
                stroke="none"
              />

              {/* Price line at 0% (current price) */}
              <ReferenceLine
                x={priceLinePosition}
                stroke="#5BE0FF"
                strokeWidth={2}
                label={{
                  value: 'Price',
                  position: 'top',
                  fill: '#5BE0FF',
                  fontSize: 10,
                  fontWeight: 500,
                }}
              />

              {/* Left boundary */}
              <ReferenceLine
                x={leftBound}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="6 6"
                label={{
                  value: formatPercentage(leftBound),
                  position: 'top',
                  fill: 'rgba(255,255,255,0.7)',
                  fontSize: 9,
                }}
              />

              {/* Right boundary */}
              <ReferenceLine
                x={rightBound}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="6 6"
                label={{
                  value: formatPercentage(rightBound),
                  position: 'top',
                  fill: 'rgba(255,255,255,0.7)',
                  fontSize: 9,
                }}
              />

              <XAxis
                dataKey="pct"
                type="number"
                scale="linear"
                tickFormatter={formatPercentage}
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                stroke="rgba(255,255,255,0.4)"
                domain={['dataMin', 'dataMax']}
              />

              <YAxis
                tickFormatter={formatShortNumber}
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                stroke="rgba(255,255,255,0.4)"
                domain={[0, yMax]}
              />

              <RechartsTooltip content={<CustomTooltip />} />

              <Area
                type="monotoneX"
                dataKey="liquidity"
                stroke="rgba(255, 255, 255, 0.85)"
                strokeWidth={2.5}
                fill="url(#liquidityGradient)"
                activeDot={{ r: 4, stroke: 'rgba(255, 255, 255, 0.85)', strokeWidth: 2, fill: 'rgba(255, 255, 255, 0.85)' }}
                style={{
                  filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.2))',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
