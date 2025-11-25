'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { LiquidityPoint } from '@/lib/transformLiquidityProfile'

interface LiquidityProfilePillsProps {
  chartData: LiquidityPoint[]
  leftBound: number
  rightBound: number
  weightedCenter: number
  currentPrice: number
}

interface InsightPillProps {
  label: string
  color: 'green' | 'yellow' | 'orange' | 'red' | 'cyan'
  tooltip: string
}

const InsightPill = ({ label, color, tooltip }: InsightPillProps) => {
  const isHighlight = color === 'orange'
  const borderColor = isHighlight ? 'rgba(236,145,23,0.3)' : 'rgba(255,255,255,0.08)'
  const backgroundColor = isHighlight ? 'rgba(236,145,23,0.08)' : 'rgba(0,0,0,0.4)'
  const textColor = isHighlight ? '#EC9117' : 'rgba(255,255,255,0.8)'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="px-3 py-1.5 rounded-md border text-sm cursor-help transition-colors hover:bg-white/5"
            style={{
              backgroundColor,
              borderColor,
              color: textColor,
            }}
          >
            {label}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-black/95 border-white/[0.12] text-white">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function LiquidityProfilePills({
  chartData,
  leftBound,
  rightBound,
  weightedCenter,
  currentPrice,
}: LiquidityProfilePillsProps) {
  // 1. Robust Range Pill
  const rangeWidth = rightBound - leftBound
  const activeRangeColor =
    rangeWidth > 80 ? 'green' : rangeWidth >= 40 ? 'yellow' : 'red'
  const activeRangeLabel = `Robust: ${leftBound.toFixed(1)}% → ${rightBound.toFixed(1)}%`

  // 2. Price Centered Pill
  const distanceToLeft = Math.abs(0 - leftBound)
  const distanceToRight = Math.abs(0 - rightBound)
  const minDistance = Math.min(distanceToLeft, distanceToRight)
  let pricePositionLabel: string
  let pricePositionColor: 'green' | 'yellow' | 'cyan' = 'cyan'
  const isCentered = minDistance > 10
  if (isCentered) {
    pricePositionLabel = 'Centered'
    pricePositionColor = 'cyan'
  } else if (distanceToLeft < 10) {
    pricePositionLabel = 'Near Lower Bound'
    pricePositionColor = 'yellow'
  } else {
    pricePositionLabel = 'Near Upper Bound'
    pricePositionColor = 'yellow'
  }

  // 3. Cushion Pill - evaluate liquidity in ±1%, ±2%, ±5% buckets
  const cushion1 = chartData.filter(p => p.pct >= -1 && p.pct <= 1).reduce((sum, p) => sum + p.liquidity, 0)
  const cushion2 = chartData.filter(p => p.pct >= -2 && p.pct <= 2).reduce((sum, p) => sum + p.liquidity, 0)
  const cushion5 = chartData.filter(p => p.pct >= -5 && p.pct <= 5).reduce((sum, p) => sum + p.liquidity, 0)
  const totalLiquidity = chartData.reduce((sum, p) => sum + p.liquidity, 0)
  
  let cushionLabel: string
  let cushionColor: 'green' | 'yellow' | 'orange' = 'green'
  const cushion1Ratio = totalLiquidity > 0 ? cushion1 / totalLiquidity : 0
  const cushion2Ratio = totalLiquidity > 0 ? cushion2 / totalLiquidity : 0
  const cushion5Ratio = totalLiquidity > 0 ? cushion5 / totalLiquidity : 0
  
  if (cushion5Ratio > 0.7) {
    cushionLabel = 'Cushion: Extremely Robust'
    cushionColor = 'green'
  } else if (cushion2Ratio > 0.5) {
    cushionLabel = 'Cushion: Very Strong'
    cushionColor = 'green'
  } else if (cushion1Ratio > 0.3) {
    cushionLabel = 'Cushion: Excellent'
    cushionColor = 'green'
  } else if (cushion2Ratio > 0.3) {
    cushionLabel = 'Cushion: Strong'
    cushionColor = 'yellow'
  } else {
    cushionLabel = 'Cushion: Moderate'
    cushionColor = 'yellow'
  }

  // 4. Skew Pill
  let skewLabel: string
  let skewColor: 'cyan' | 'yellow' | 'green' = 'cyan'
  if (weightedCenter > 5) {
    skewLabel = `Skew: +${weightedCenter.toFixed(1)}% Upside`
    skewColor = 'cyan'
  } else if (weightedCenter < -5) {
    skewLabel = `Skew: ${weightedCenter.toFixed(1)}% Downside`
    skewColor = 'cyan'
  } else {
    skewLabel = `Skew: ${weightedCenter.toFixed(1)}% Neutral`
    skewColor = 'green'
  }

  // 5. Taper Warning Pill
  const tailLiquidity = chartData
    .filter(p => p.pct > 50)
    .reduce((sum, p) => sum + p.liquidity, 0)
  const tailRatio = totalLiquidity > 0 ? tailLiquidity / totalLiquidity : 0
  const tailTaperLabel = tailRatio < 0.1 ? 'Tapering: Past +50%' : 'Tapering: Normal'
  const tailTaperColor: 'green' | 'yellow' | 'orange' = tailRatio < 0.1 ? 'orange' : 'green'

  // 6. Resilience Pill
  const resilienceLabel =
    totalLiquidity > 300000
      ? 'Resilience: High'
      : totalLiquidity > 150000
      ? 'Resilience: Medium'
      : 'Resilience: Low'
  const resilienceColor: 'green' | 'yellow' | 'red' =
    totalLiquidity > 300000 ? 'green' : totalLiquidity > 150000 ? 'yellow' : 'red'

  return (
    <div className="flex flex-wrap gap-2">
      <InsightPill
        label={activeRangeLabel}
        color={activeRangeColor}
        tooltip="Wide band, robust range. Actual price range where liquidity exists. Outside this band the vault becomes out-of-range."
      />
      <InsightPill
        label={skewLabel}
        color={skewColor}
        tooltip={weightedCenter > 5 || weightedCenter < -5 ? "Vault is biased " + (weightedCenter > 0 ? "upward, earns more on rallies" : "downward, earns more on dips") + ". Liquidity-weighted center point indicates directional fee optimization." : "Liquidity-weighted center point. Indicates directional fee optimization."}
      />
      <InsightPill
        label={pricePositionLabel}
        color={pricePositionColor}
        tooltip={
          isCentered
            ? 'Current price is centered, no rebalance needed. Price sits comfortably inside the active range.'
            : 'Vault is approaching depletion on this side.'
        }
      />
      <InsightPill
        label={cushionLabel}
        color={cushionColor}
        tooltip="Strong liquidity within ±2%. Liquidity density around current price. A strong cushion improves execution and protects against slippage."
      />
      <InsightPill
        label={tailTaperLabel}
        color={tailTaperColor}
        tooltip="Liquidity becomes thin past +50%. Extreme rallies will execute on thinner depth."
      />
      <InsightPill
        label={resilienceLabel}
        color={resilienceColor}
        tooltip="Overall vault robustness considering range width and liquidity distribution."
      />
    </div>
  )
}

