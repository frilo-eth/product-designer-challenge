'use client'

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { LiquidityPoint } from '@/lib/transformLiquidityProfile'
import { LiquidityTooltip } from '../tooltips/LiquidityTooltip'

interface LiquidityProfileChartProps {
  chartData: LiquidityPoint[]
  leftBound: number
  rightBound: number
  weightedCenter: number
  pairLabel?: string
}

const formatShortNumber = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(0)
}

const getExecutionQuality = (maxLiquidity: number, medianLiquidity: number) => {
  if (maxLiquidity === 0) return 'thin'
  const ratio = medianLiquidity / maxLiquidity
  if (ratio >= 0.65) return 'high'
  if (ratio >= 0.35) return 'normal'
  return 'thin'
}

export function LiquidityProfileChart({
  chartData,
  leftBound,
  rightBound,
  weightedCenter,
  pairLabel = 'Liquidity Profile',
}: LiquidityProfileChartProps) {
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="border-slate-800 bg-slate-950/60">
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Liquidity profile data unavailable.
        </CardContent>
      </Card>
    )
  }

  const sortedData = [...chartData].sort((a, b) => a.pct - b.pct)
  const currentPriceLine = 0
  
  // Filter out zero liquidity points for statistics calculations
  const meaningfulData = sortedData.filter(point => point.liquidity > 0)
  const maxLiquidity = meaningfulData.length > 0 
    ? Math.max(...meaningfulData.map(point => point.liquidity))
    : Math.max(...sortedData.map(point => point.liquidity)) || 1
  const yMax = maxLiquidity * 1.15 || 1
  
  // Calculate median from meaningful data only
  const medianLiquidity = meaningfulData.length > 0
    ? meaningfulData.slice().sort((a, b) => a.liquidity - b.liquidity)[Math.floor(meaningfulData.length / 2)].liquidity
    : sortedData.slice().sort((a, b) => a.liquidity - b.liquidity)[Math.floor(sortedData.length / 2)]?.liquidity || 0
  
  const executionQuality = getExecutionQuality(maxLiquidity, medianLiquidity)
  const skewDirection = weightedCenter === 0 ? 'neutral' : weightedCenter > 0 ? 'upside' : 'downside'

  return (
    <Card
      className="rounded-[12px] border text-white"
      style={{ backgroundColor: '#0f1218', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
        <div>
          <CardTitle className="text-lg text-slate-200">Liquidity Distribution (Relative Price %)</CardTitle>
          <CardDescription className="text-slate-400">{pairLabel}</CardDescription>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:text-white"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="w-64 border-slate-800 bg-slate-950 text-xs text-slate-300">
              <ul className="space-y-1">
                <li>Higher area near 0% = deeper liquidity.</li>
                <li>Boundaries indicate out-of-range risks.</li>
                <li>Skew highlights directional exposure.</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div
          className="h-[360px] rounded-[12px] border p-3"
          style={{ backgroundColor: '#0f1218', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedData} margin={{ left: 0, right: 0, top: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="liqLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3af2c1" />
                  <stop offset="50%" stopColor="#4df6ff" />
                  <stop offset="100%" stopColor="#3af2c1" />
                </linearGradient>
                <linearGradient id="liqFillGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(58,242,193,0.08)" />
                  <stop offset="50%" stopColor="rgba(77,246,255,0.08)" />
                  <stop offset="100%" stopColor="rgba(58,242,193,0.08)" />
                </linearGradient>
              </defs>

              <ReferenceArea x1={-5} x2={5} fill="rgba(239,68,68,0.10)" />
              <ReferenceArea x1={-2} x2={2} fill="rgba(234,179,8,0.12)" />
              <ReferenceArea x1={-1} x2={1} fill="rgba(34,197,94,0.12)" />

              <ReferenceLine
                x={currentPriceLine}
                stroke="#eab308"
                strokeWidth={2.2}
                label={{ value: 'current price', position: 'top', fill: '#eab308', fontSize: 10 }}
              />
              <ReferenceLine
                x={weightedCenter}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                label={{ value: 'skew', position: 'top', fill: '#38bdf8', fontSize: 10 }}
              />
              <ReferenceLine
                x={leftBound}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="6 6"
                label={{ value: 'boundary', position: 'top', fill: 'rgba(255,255,255,0.7)', fontSize: 9 }}
              />
              <ReferenceLine
                x={rightBound}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="6 6"
                label={{ value: 'boundary', position: 'top', fill: 'rgba(255,255,255,0.7)', fontSize: 9 }}
              />

              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <XAxis
                dataKey="pct"
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                stroke="rgba(255,255,255,0.4)"
              />
              <YAxis
                tickFormatter={(value) => formatShortNumber(value)}
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                stroke="rgba(255,255,255,0.4)"
                domain={[0, yMax]}
              />
              <RechartsTooltip content={<LiquidityTooltip />} />
              <Area
                type="monotone"
                dataKey="liquidity"
                stroke="url(#liqLineGradient)"
                fill="url(#liqFillGradient)"
                strokeWidth={2}
                activeDot={{ r: 3, stroke: '#4df6ff', strokeWidth: 1 }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(77,246,255,0.15))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="rounded-full border border-white/10 px-3 py-1 text-slate-200">
                Range width
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {leftBound.toFixed(1)}% → {rightBound.toFixed(1)}%
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger className="rounded-full border border-white/10 px-3 py-1 text-slate-200">
                Vault skew
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {weightedCenter >= 0 ? '+' : ''}
                {weightedCenter.toFixed(2)}% towards {skewDirection}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger className="rounded-full border border-white/10 px-3 py-1 text-slate-200">
                Execution quality
              </TooltipTrigger>
              <TooltipContent className="text-xs capitalize">{executionQuality}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}

