'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card } from '@/components/ui/card'
import type { InventoryRatioPoint, Timeframe } from '@/lib/hooks/useChartData'

// ============================================
// Design Tokens (from Figma)
// ============================================
const COLORS = {
  surface: '#171312',
  background: '#0B0909',
  border: '#221C1B',
  wormbone: '#F5EBE5',
  muted: '#8E7571',
}

// Token colors from Figma - can be overridden via props
const DEFAULT_TOKEN_COLORS = {
  base: '#103E36',   // VSN green (base token)
  quote: '#2775CA',  // USDC blue (quote token)
}

// Consistent bar count across all timeframes for smooth visualization
const TARGET_BAR_COUNT = 30

// ============================================
// Data Resampling with Interpolation
// ============================================
function resampleData(
  data: InventoryRatioPoint[],
  targetCount: number,
  timeframe: Timeframe
): InventoryRatioPoint[] {
  if (!data || data.length === 0) return []
  
  // Sort data chronologically
  const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  
  // If we only have one data point, replicate it across all bars
  if (sorted.length === 1) {
    const point = sorted[0]
    const now = new Date()
    const timeframeDuration = 
      timeframe === '24h' ? 24 * 60 * 60 * 1000 :
      timeframe === '1W' ? 7 * 24 * 60 * 60 * 1000 :
      30 * 24 * 60 * 60 * 1000
    
    const startTime = now.getTime() - timeframeDuration
    
    return Array.from({ length: targetCount }, (_, i) => {
      const ratio = i / (targetCount - 1)
      const timestamp = new Date(startTime + ratio * timeframeDuration)
      return {
        ...point,
        timestamp,
      }
    })
  }

  // Get the time range from the data
  const startTime = sorted[0].timestamp.getTime()
  const endTime = sorted[sorted.length - 1].timestamp.getTime()
  const timeRange = endTime - startTime

  // Generate evenly spaced points by interpolating
  const result: InventoryRatioPoint[] = []
  
  for (let i = 0; i < targetCount; i++) {
    const ratio = i / (targetCount - 1)
    const targetTime = startTime + ratio * timeRange
    
    // Find the two surrounding data points for interpolation
    let lowerIdx = 0
    let upperIdx = sorted.length - 1
    
    for (let j = 0; j < sorted.length - 1; j++) {
      if (sorted[j].timestamp.getTime() <= targetTime && sorted[j + 1].timestamp.getTime() >= targetTime) {
        lowerIdx = j
        upperIdx = j + 1
        break
      }
    }
    
    const lower = sorted[lowerIdx]
    const upper = sorted[upperIdx]
    
    // If same point or very close, just use the lower point
    if (lowerIdx === upperIdx || lower.timestamp.getTime() === upper.timestamp.getTime()) {
      result.push({
        ...lower,
        timestamp: new Date(targetTime),
      })
    } else {
      // Interpolate between the two points
      const lowerTime = lower.timestamp.getTime()
      const upperTime = upper.timestamp.getTime()
      const t = (targetTime - lowerTime) / (upperTime - lowerTime)
      
      result.push({
        timestamp: new Date(targetTime),
        token0Percentage: lower.token0Percentage + t * (upper.token0Percentage - lower.token0Percentage),
        token1Percentage: lower.token1Percentage + t * (upper.token1Percentage - lower.token1Percentage),
        totalValueUSD: lower.totalValueUSD + t * (upper.totalValueUSD - lower.totalValueUSD),
      })
    }
  }

  return result
}

// ============================================
// Date Formatting
// ============================================
function formatDateLabel(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.getDate()
  return `${month} ${day}`
}

function formatTooltipDate(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.getDate()
  return `${month} ${day}`
}

// ============================================
// Custom Tooltip
// ============================================
interface InventoryTooltipProps {
  active?: boolean
  payload?: Array<{ payload: InventoryRatioPoint }>
  token0Symbol?: string
  token1Symbol?: string
  token0Color?: string
  token1Color?: string
}

function InventoryTooltip({
  active,
  payload,
  token0Symbol = 'Token0',
  token1Symbol = 'Token1',
  token0Color = DEFAULT_TOKEN_COLORS.base,
  token1Color = DEFAULT_TOKEN_COLORS.quote,
}: InventoryTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload
  const dateStr = formatTooltipDate(data.timestamp)

  return (
    <div className="rounded-lg border border-[#221C1B] bg-[#171312] p-2 flex flex-col gap-2 min-w-[140px]">
      {/* Date header */}
      <div className="flex items-start justify-between">
        <span className="text-[10px] leading-[14px] text-[#F5EBE5]">
          {dateStr}
        </span>
      </div>

      {/* Token breakdown */}
      <div className="flex flex-col gap-1">
        {/* Base token (token0) */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: token0Color }}
            />
            <span className="text-[12px] leading-[16px] text-[#8E7571]">
              {token0Symbol}
            </span>
          </div>
          <span className="text-[12px] leading-[16px] text-[#F5EBE5] text-right tabular-nums">
            {data.token0Percentage.toFixed(2)}%
          </span>
        </div>

        {/* Quote token (token1) */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: token1Color }}
            />
            <span className="text-[12px] leading-[16px] text-[#8E7571]">
              {token1Symbol}
            </span>
          </div>
          <span className="text-[12px] leading-[16px] text-[#F5EBE5] text-right tabular-nums">
            {data.token1Percentage.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Timeframe Toggle
// ============================================
interface TimeframeToggleProps {
  value: Timeframe
  onChange: (timeframe: Timeframe) => void
}

function TimeframeToggle({ value, onChange }: TimeframeToggleProps) {
  const options: { value: Timeframe; label: string }[] = [
    { value: '24h', label: '24H' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '30D' },
  ]

  return (
    <div className="bg-[#0B0909] rounded-[10px] p-0.5 flex items-center h-7">
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              relative h-full px-2 w-10 flex items-center justify-center
              text-[10px] leading-[1.2] transition-colors
              ${isActive
                ? 'text-[#F5EBE5]'
                : 'text-[#8E7571] hover:text-[#F5EBE5]/70'
              }
            `}
          >
            {isActive && (
              <div className="absolute inset-0 bg-[#171312] border border-[#221C1B] rounded-lg" />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================
// Main Component
// ============================================
export interface InventoryRatioCardProps {
  data: InventoryRatioPoint[] | null
  token0Symbol?: string
  token1Symbol?: string
  /** Color for base token (token0) - default: VSN green #103E36 */
  token0Color?: string
  /** Color for quote token (token1) - default: USDC blue #2775CA */
  token1Color?: string
  initialTimeframe?: Timeframe
  onTimeframeChange?: (timeframe: Timeframe) => void
}

export function InventoryRatioCard({
  data,
  token0Symbol = 'Token0',
  token1Symbol = 'Token1',
  token0Color = DEFAULT_TOKEN_COLORS.base,
  token1Color = DEFAULT_TOKEN_COLORS.quote,
  initialTimeframe = '1M',
  onTimeframeChange,
}: InventoryRatioCardProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const handleTimeframeChange = useCallback(
    (newTimeframe: Timeframe) => {
      setTimeframe(newTimeframe)
      onTimeframeChange?.(newTimeframe)
    },
    [onTimeframeChange]
  )

  // Filter data by timeframe and sort chronologically (oldest first)
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return []

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

    return data
      .filter((point) => point.timestamp >= cutoffDate)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }, [data, timeframe])

  // Resample to target bar count (always 30 bars for smooth visualization)
  const chartData = useMemo(() => {
    return resampleData(filteredData, TARGET_BAR_COUNT, timeframe)
  }, [filteredData, timeframe])

  // Calculate X-axis labels (start, middle, end)
  const xAxisLabels = useMemo(() => {
    if (chartData.length === 0) return { start: '', middle: '', end: '' }

    const first = chartData[0]
    const last = chartData[chartData.length - 1]
    const midIndex = Math.floor(chartData.length / 2)
    const mid = chartData[midIndex]

    return {
      start: formatDateLabel(first.timestamp),
      middle: formatDateLabel(mid.timestamp),
      end: formatDateLabel(last.timestamp),
    }
  }, [chartData])

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card className="h-[260px] bg-[#171312] border-[#221C1B] text-white rounded-[16px] p-3 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] leading-[14px] text-[#8E7571]">
              Historical composition
            </p>
            <h3 className="text-base font-medium text-[#F5EBE5] leading-6">
              Inventory Ratio
            </h3>
          </div>
          <TimeframeToggle value={timeframe} onChange={handleTimeframeChange} />
        </div>
        <div className="mt-3 flex-1 flex items-center justify-center">
          <p className="text-[12px] text-[#8E7571]">No inventory data available</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-[260px] bg-[#171312] border-[#221C1B] text-white rounded-[16px] p-3 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-[12px] leading-[14px] text-[#8E7571]">
            Historical composition
          </p>
          <h3 className="text-base font-medium text-[#F5EBE5] leading-6">
            Inventory Ratio
          </h3>
        </div>
        <TimeframeToggle value={timeframe} onChange={handleTimeframeChange} />
      </div>

      {/* Chart */}
      <div className="mt-3 flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <XAxis dataKey="timestamp" hide />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              cursor={false}
              content={
                <InventoryTooltip
                  token0Symbol={token0Symbol}
                  token1Symbol={token1Symbol}
                  token0Color={token0Color}
                  token1Color={token1Color}
                />
              }
            />
            {/* Base token (token0) - bottom of stack */}
            <Bar
              dataKey="token0Percentage"
              stackId="inventory"
              radius={[0, 0, 6, 6]}
              maxBarSize={6}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
            >
              {chartData.map((_, index) => {
                const isHovered = hoveredIndex === index
                const isAnyHovered = hoveredIndex !== null

                // Rest state: full color
                // Hover state: hovered bar full color, others muted
                let fill = token0Color
                let opacity = 1
                if (isAnyHovered && !isHovered) {
                  opacity = 0.2
                }

                return (
                  <Cell
                    key={`cell-token0-${index}`}
                    fill={fill}
                    fillOpacity={opacity}
                    stroke="none"
                    style={{
                      transition: 'fill-opacity 150ms ease-out',
                    }}
                  />
                )
              })}
            </Bar>
            {/* Quote token (token1) - top of stack */}
            <Bar
              dataKey="token1Percentage"
              stackId="inventory"
              radius={[6, 6, 0, 0]}
              maxBarSize={6}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
            >
              {chartData.map((_, index) => {
                const isHovered = hoveredIndex === index
                const isAnyHovered = hoveredIndex !== null

                // Rest state: full color
                // Hover state: hovered bar full color, others muted
                let fill = token1Color
                let opacity = 1
                if (isAnyHovered && !isHovered) {
                  opacity = 0.2
                }

                return (
                  <Cell
                    key={`cell-token1-${index}`}
                    fill={fill}
                    fillOpacity={opacity}
                    stroke="none"
                    style={{
                      transition: 'fill-opacity 150ms ease-out',
                    }}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* X-axis labels */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-[10px] leading-[10px] tracking-[-0.16px] text-[#8E7571]">
          {xAxisLabels.start}
        </span>
        <span className="text-[10px] leading-[10px] tracking-[-0.16px] text-[#8E7571]">
          {xAxisLabels.middle}
        </span>
        <span className="text-[10px] leading-[10px] tracking-[-0.16px] text-[#8E7571]">
          {xAxisLabels.end}
        </span>
      </div>
    </Card>
  )
}

