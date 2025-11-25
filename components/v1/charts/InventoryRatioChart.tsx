'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { InventoryRatioPoint } from '@/lib/hooks/useChartData'

interface InventoryRatioChartProps {
  data: InventoryRatioPoint[]
  token0Symbol?: string
  token1Symbol?: string
  timeframe?: '24h' | '1W' | '1M'
}

export function InventoryRatioChart({
  data,
  token0Symbol = 'Token0',
  token1Symbol = 'Token1',
  timeframe = '1M',
}: InventoryRatioChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No inventory history data available
      </div>
    )
  }

  const targetBars = timeframe === '24h' ? 12 : timeframe === '1W' ? 21 : 30
  const timeframeDurationMs =
    timeframe === '24h'
      ? 24 * 60 * 60 * 1000
      : timeframe === '1W'
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000

  const resampleInventoryData = (
    points: InventoryRatioPoint[],
    target: number
  ): InventoryRatioPoint[] => {
    if (!points || points.length === 0 || target <= 0) return []

    const sorted = [...points].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )
    const maxIndex = sorted.length - 1

    if (maxIndex === 0) {
      const singlePoint = sorted[0]
      const endTime = singlePoint.timestamp.getTime()
      const startTime = endTime - timeframeDurationMs
      return Array.from({ length: target }, (_, i) => {
        const ratio = target === 1 ? 0 : i / (target - 1)
        const ts = startTime + ratio * timeframeDurationMs
        return {
          ...singlePoint,
          timestamp: new Date(ts),
        }
      })
    }

    const endTime = sorted[maxIndex].timestamp.getTime()
    const startTime = endTime - timeframeDurationMs

    return Array.from({ length: target }, (_, i) => {
      const ratio = target === 1 ? 0 : i / (target - 1)
      const index = Math.min(Math.round(ratio * maxIndex), maxIndex)
      const sourcePoint = sorted[index]
      const ts = startTime + ratio * timeframeDurationMs

      return {
        ...sourcePoint,
        timestamp: new Date(ts),
      }
    })
  }

  const filteredData = resampleInventoryData(data, targetBars)

  const formatDate = (date: Date) => {
    if (timeframe === '24h') {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: timeframe === '1W' ? '2-digit' : undefined,
    }).format(date)
  }

  // Shadcn-inspired monochrome palette (base = white, quote = gray)
  const token0Color = '#FFFFFF'
  const token1Color = '#9CA3AF'

  return (
    <div className="w-full inventory-ratio-chart" style={{ isolation: 'isolate' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .inventory-ratio-chart svg rect,
        .inventory-ratio-chart svg path,
        .inventory-ratio-chart svg .recharts-bar-rectangle {
          stroke: none !important;
          stroke-width: 0 !important;
        }
      `}} />
      <ResponsiveContainer width="100%" height={300}>
        <BarChart 
          data={filteredData} 
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          barCategoryGap={timeframe === '1M' ? 14 : timeframe === '1W' ? 22 : 30}
          barGap={0}
        >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis
          dataKey="timestamp"
          stroke="rgba(255,255,255,0.2)"
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
          tickFormatter={(value) => formatDate(new Date(value))}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="rgba(255,255,255,0.2)"
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          label={{
            value: 'Percentage (%)',
            angle: -90,
            position: 'insideLeft',
            fill: 'rgba(255,255,255,0.6)',
            fontSize: 11,
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0,0,0,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            padding: '12px',
            backdropFilter: 'blur(8px)',
          }}
          labelStyle={{ color: '#F5F5F5', fontSize: 12, marginBottom: '4px' }}
          formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
          labelFormatter={(label) => formatDate(new Date(label))}
        />
        <Bar
          dataKey="token0Percentage"
          name={token0Symbol}
          stackId="inventory"
          fill={token0Color}
          barSize={9}
          radius={[0, 0, 8, 8]} // Rounded bottom corners (bottomRight, bottomLeft)
          stroke="none"
        />
        <Bar
          dataKey="token1Percentage"
          name={token1Symbol}
          stackId="inventory"
          fill={token1Color}
          barSize={9}
          radius={[8, 8, 0, 0]} // Rounded top corners (topLeft, topRight)
          stroke="none"
        />
      </BarChart>
    </ResponsiveContainer>
    <div className="mt-3 flex items-center gap-4 text-xs text-white/70">
      <div className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-white" />
        <span>{token0Symbol} (base)</span>
      </div>
      <div className="flex items-center gap-1 text-white/60">
        <span className="inline-block h-2 w-2 rounded-full bg-[#9CA3AF]" />
        <span>{token1Symbol} (quote)</span>
      </div>
    </div>
    </div>
  )
}

