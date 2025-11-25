'use client'

import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts'
import type { FeesChartPoint } from '@/lib/hooks/useChartData'

interface FeesChartProps {
  data: FeesChartPoint[] | null
  token0Symbol?: string
  token1Symbol?: string
}

export function FeesChart({ data, token0Symbol = 'Token0', token1Symbol = 'Token1' }: FeesChartProps) {
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('FeesChart render:', { 
      hasData: !!data, 
      dataLength: data?.length, 
      firstPoint: data?.[0],
      token0Symbol,
      token1Symbol 
    })
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>No fees history data available</p>
          <p className="text-xs mt-2 opacity-70">Data: {data ? 'null' : 'empty array'}</p>
        </div>
      </div>
    )
  }

  // Check if all values are zero
  const allZeros = data.every(p => 
    p.feesUSD === 0 && 
    (!p.volumeUSD || p.volumeUSD === 0)
  )

  if (allZeros) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center max-w-md">
          <p className="font-medium mb-2">No Fees Generated</p>
          <p className="text-xs opacity-70">
            The API returned {data.length} data points for the selected period, but all fee values are zero.
          </p>
          <p className="text-xs mt-2 opacity-60">
            This vault may not have generated fees yet, or there was no trading activity in this date range.
            <br />
            Try selecting a longer time period or check if this vault is actively being used.
          </p>
        </div>
      </div>
    )
  }

  // Validate data structure
  if (data[0]?.feesUSD === undefined && data[0]?.feesUSD !== 0) {
    console.warn('FeesChart: Invalid data structure', { firstPoint: data[0], dataLength: data.length })
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>Invalid data format</p>
          <p className="text-xs mt-2 opacity-70">Check console for details</p>
        </div>
      </div>
    )
  }

  // Check if we have volume data
  const hasVolume = data.some(point => point.volumeUSD !== undefined)
  const hasTokenFees = data.some(point => point.fees0 !== undefined || point.fees1 !== undefined)

  // Custom tooltip with all available data
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as FeesChartPoint
      
      return (
        <div className="bg-black/95 border border-white/[0.12] rounded-lg p-3 shadow-2xl backdrop-blur-sm">
          <p className="text-white font-medium mb-2">{`Date: ${label}`}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-white/50">Total Fees (USD):</span>
              <span className="text-[#EC9117] font-medium">
                ${dataPoint.feesUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            {dataPoint.fees0 !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Fees {token0Symbol}:</span>
                <span className="text-white/80 font-medium">
                  {dataPoint.fees0.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                </span>
              </div>
            )}
            
            {dataPoint.fees1 !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Fees {token1Symbol}:</span>
                <span className="text-white/80 font-medium">
                  {dataPoint.fees1.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                </span>
              </div>
            )}
            
            {dataPoint.volumeUSD !== undefined && (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-white/50">Volume (USD):</span>
                  <span className="text-white/80 font-medium">
                    ${dataPoint.volumeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                {dataPoint.feeEfficiency !== undefined && (
                  <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
                    <span className="text-white/50">Fee Rate:</span>
                    <span className="text-white/70 font-medium">
                      {dataPoint.feeEfficiency.toFixed(3)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full" style={{ minHeight: '400px' }}>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart 
          data={data} 
          margin={{ top: 10, right: 30, bottom: 60, left: 0 }}
        >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="rgba(255,255,255,0.2)"
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={60}
          axisLine={false}
          tickLine={false}
        />
        
        {/* Left Y-Axis for Fees */}
        <YAxis
          yAxisId="fees"
          stroke="rgba(255,255,255,0.2)"
          tick={{ fill: '#EC9117', fontSize: 11 }}
          tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toLocaleString()}`}
          label={{
            value: 'Fees (USD)',
            angle: -90,
            position: 'insideLeft',
            fill: '#EC9117',
            style: { textAnchor: 'middle' }
          }}
          axisLine={false}
          tickLine={false}
        />
        
        {/* Right Y-Axis for Volume (if available) */}
        {hasVolume && (
          <YAxis
            yAxisId="volume"
            orientation="right"
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
            tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toLocaleString()}`}
            label={{
              value: 'Volume (USD)',
              angle: 90,
              position: 'insideRight',
              fill: 'rgba(255,255,255,0.6)',
              style: { textAnchor: 'middle' }
            }}
            axisLine={false}
            tickLine={false}
          />
        )}

        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '20px', color: 'rgba(255,255,255,0.8)' }}
          iconType="rect"
        />

        {/* Main fees bar chart */}
        <Bar 
          yAxisId="fees"
          dataKey="feesUSD" 
          fill="#EC9117" 
          name="Fees (USD)"
          radius={[4, 4, 0, 0]}
        />

        {/* Volume line chart */}
        {hasVolume && (
          <Line
            yAxisId="volume"
            type="monotone"
            dataKey="volumeUSD"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={2}
            dot={false}
            name="Volume (USD)"
          />
        )}

        {/* Fee efficiency line (if volume available) */}
        {hasVolume && data.some(p => p.feeEfficiency !== undefined) && (
          <Line
            yAxisId="fees"
            type="monotone"
            dataKey="feeEfficiency"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            name="Fee Rate (%)"
          />
        )}
        </ComposedChart>
    </ResponsiveContainer>
    </div>
  )
}

