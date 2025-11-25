'use client'

import type { TooltipProps } from 'recharts'
import type { LiquidityPoint } from '@/lib/transformLiquidityProfile'

interface PayloadEntry {
  payload: LiquidityPoint
  value: number
}

const zoneLabelMap: Record<string, string> = {
  efficient: 'Efficient',
  warning: 'Warning',
  critical: 'Critical',
}

export function LiquidityTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null

  const first = payload[0] as unknown as PayloadEntry
  const point = first?.payload

  if (!point) return null

  const liquidity = first.value ?? point.liquidity
  const zone = zoneLabelMap[point.band] || 'Out of range'

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/95 px-2.5 py-2 text-xs shadow-lg">
      <div className="text-slate-200">Relative price: {label}%</div>
      <div className="text-slate-300">Liquidity density: {liquidity.toLocaleString()}</div>
      <div className="text-slate-400">Band: {zone}</div>
    </div>
  )
}

