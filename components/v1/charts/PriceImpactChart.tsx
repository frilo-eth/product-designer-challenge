'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'
import type { PriceImpactChartPoint, PriceImpactFlattenedPoint } from '@/lib/hooks/useChartData'

interface PriceImpactChartProps {
  data: PriceImpactChartPoint[] | PriceImpactFlattenedPoint[] | null
  marketDepth?: { buy?: number; sell?: number } | null
  depletionThreshold?: number | null
  insights?: string[] | null
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function PriceImpactChart({ data, marketDepth, depletionThreshold, insights }: PriceImpactChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-white/40">
        No price impact data available
      </div>
    )
  }

  const isGrouped = 'buyImpact' in (data[0] || {})

  if (isGrouped) {
    const groupedData = data as PriceImpactChartPoint[]
    const maxImpact = Math.max(...groupedData.map(point => Math.max(point.buyImpact, point.sellImpact)))
    const yMax = Math.max(5, Math.ceil(maxImpact + 1))
    const tradeSizes = groupedData.map(point => point.tradeSize)
    const minTrade = Math.max(1, Math.min(...tradeSizes))
    const maxTrade = Math.max(...tradeSizes)

    const generateLogTicks = (min: number, max: number, count = 6) => {
      const ticks: number[] = []
      const logMin = Math.log10(min)
      const logMax = Math.log10(max)
      for (let i = 0; i < count; i++) {
        const value = Math.pow(10, logMin + ((logMax - logMin) / (count - 1)) * i)
        const rounded = Math.max(1, Math.round(value / 100) * 100)
        ticks.push(rounded)
      }
      return ticks
    }

    const ticks = generateLogTicks(minTrade, maxTrade)

    return (
      <div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={groupedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <ReferenceArea y1={0} y2={2} fill="rgba(255,255,255,0.04)" fillOpacity={1} />
            <ReferenceArea y1={2} y2={5} fill="rgba(255,255,255,0.02)" fillOpacity={1} />
            <ReferenceArea y1={5} y2={yMax} fill="rgba(255,255,255,0.01)" fillOpacity={1} />
            <XAxis
              dataKey="tradeSize"
              type="number"
              scale="log"
              domain={[minTrade, maxTrade]}
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
              ticks={ticks}
              tickFormatter={(value) => currencyFormatter.format(value)}
              label={{
                value: 'Trade Size (USD)',
                position: 'insideBottom',
                offset: -5,
                fill: 'rgba(255,255,255,0.6)',
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
              domain={[0, yMax]}
              label={{
                value: 'Price Impact (%)',
                angle: -90,
                position: 'insideLeft',
                fill: 'rgba(255,255,255,0.6)',
              }}
              axisLine={false}
              tickLine={false}
            />
            {marketDepth?.buy && (
              <ReferenceLine
                x={marketDepth.buy}
                stroke="rgba(255,255,255,0.5)"
                strokeDasharray="6 4"
                label={{ value: 'Buy Depth', position: 'top', fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
              />
            )}
            {marketDepth?.sell && (
              <ReferenceLine
                x={marketDepth.sell}
                stroke="rgba(255,255,255,0.4)"
                strokeDasharray="6 4"
                label={{ value: 'Sell Depth', position: 'top', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              />
            )}
            {depletionThreshold && (
              <ReferenceLine
                x={depletionThreshold}
                stroke="#EC9117"
                strokeDasharray="3 3"
                label={{ value: 'Breaking Point', position: 'top', fill: '#EC9117', fontSize: 10 }}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.95)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
              }}
              labelStyle={{ color: '#FFFFFF' }}
              formatter={(value: number, name, payload) => {
                const point = payload?.payload as PriceImpactChartPoint
                return [`${value.toFixed(2)}%`, `${name} (${point.efficiencyZone || 'n/a'})`]
              }}
              labelFormatter={(label) => `Trade Size: ${currencyFormatter.format(Number(label))}`}
            />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} iconType="line" />
            <Line
              type="monotone"
              dataKey="buyImpact"
              name="Buy"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="sellImpact"
              name="Sell"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {insights && insights.length > 0 && (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/40 p-4">
            <h4 className="text-sm font-semibold text-white mb-2">Insights</h4>
            <ul className="space-y-1 text-sm text-white/60">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#EC9117]" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const flattenedData = data as PriceImpactFlattenedPoint[]
  const buyData = flattenedData.filter((d) => d.direction === 'buy')
  const sellData = flattenedData.filter((d) => d.direction === 'sell')

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="tradeSize"
          stroke="rgba(255,255,255,0.2)"
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
          label={{
            value: 'Trade Size (USD)',
            position: 'insideBottom',
            offset: -5,
            fill: 'rgba(255,255,255,0.6)',
          }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="rgba(255,255,255,0.2)"
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
          label={{
            value: 'Price Impact (%)',
            angle: -90,
            position: 'insideLeft',
            fill: 'rgba(255,255,255,0.6)',
          }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0,0,0,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
          }}
          labelStyle={{ color: '#FFFFFF' }}
          formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
          labelFormatter={(label) => `Trade Size: $${Number(label).toLocaleString()}`}
        />
        <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} iconType="line" />
        <Line
          type="monotone"
          data={buyData}
          dataKey="impact"
          name="Buy"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          data={sellData}
          dataKey="impact"
          name="Sell"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

