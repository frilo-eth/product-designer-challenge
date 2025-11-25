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
import type { FeesChartPoint, Timeframe } from '@/lib/hooks/useChartData'

// ============================================
// Design Tokens (from Figma)
// ============================================
const COLORS = {
  surface: '#171312',
  background: '#0B0909',
  border: '#221C1B',
  wormbone: '#F5EBE5',
  wormboneSubtle: 'rgba(245, 235, 229, 0.05)',
  muted: '#8E7571',
}

// Target bar counts per timeframe (from Figma)
// Note: The fees API returns daily data, so actual bar count depends on available data
// 24h: Target 12 bars (but API only has 1-2 daily data points)
// 1W: Target 14 bars (but API only has 7 daily data points)
// 30D: Target 24 bars (API has ~30 daily data points)
const BAR_COUNTS: Record<Timeframe, number> = {
  '24h': 12,  // Will show all available data (typically 1-2 points)
  '1W': 14,   // Will show all available data (typically 7 points)
  '1M': 24,   // Will resample ~30 points to 24
}

// ============================================
// Data Resampling
// ============================================
function resampleData(
  data: FeesChartPoint[],
  targetCount: number
): FeesChartPoint[] {
  if (!data || data.length === 0) return []
  
  // If we have fewer or equal data points than target, use all data
  // This handles cases where API returns daily data but we want more granular views
  if (data.length <= targetCount) return data

  // Resample to target count
  const result: FeesChartPoint[] = []
  const step = (data.length - 1) / (targetCount - 1)

  for (let i = 0; i < targetCount; i++) {
    const index = Math.round(i * step)
    result.push(data[Math.min(index, data.length - 1)])
  }

  return result
}

// ============================================
// Date Formatting
// ============================================
function formatDateLabel(date: Date, timeframe: Timeframe): string {
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
interface FeesTooltipProps {
  active?: boolean
  payload?: Array<{ payload: FeesChartPoint }>
  token0Symbol?: string
  token1Symbol?: string
}

function FeesTooltip({
  active,
  payload,
  token0Symbol = 'Token0',
  token1Symbol = 'Token1',
}: FeesTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload
  const dateStr = formatTooltipDate(data.timestamp)

  // API maps: quoteTokenFees → fees0, govTokenFees → fees1
  // For most vaults (VSN/USDC, VSN/ETH, MORPHO/ETH, FOLKS/USDT):
  //   fees0 = quoteToken = token1, fees1 = govToken = token0 (need swap)
  // For WOO/WETH: fees0 = token0, fees1 = token1 (direct mapping)
  // Detect WOO/WETH by checking token symbols
  const isWooWeth = (token0Symbol === 'WOO' && token1Symbol === 'WETH') || 
                    (token0Symbol === 'WETH' && token1Symbol === 'WOO')
  const shouldSwap = !isWooWeth

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
        {(() => {
          const fees0Value = shouldSwap ? data.fees1 : data.fees0
          if (fees0Value === undefined) return null
          return (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12px] leading-[16px] text-[#8E7571]">
                {token0Symbol}
              </span>
              <span className="text-[12px] leading-[16px] text-[#F5EBE5] text-right tabular-nums">
                {fees0Value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )
        })()}
        {(() => {
          const fees1Value = shouldSwap ? data.fees0 : data.fees1
          if (fees1Value === undefined) return null
          return (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12px] leading-[16px] text-[#8E7571]">
                {token1Symbol}
              </span>
              <span className="text-[12px] leading-[16px] text-[#F5EBE5] text-right tabular-nums">
                {fees1Value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )
        })()}

        {/* Divider */}
        <div className="h-px bg-[rgba(245,235,229,0.1)] my-0.5" />

        {/* Total fees */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-[12px] leading-[16px] text-[#8E7571]">
            Total fees
          </span>
          <span className="text-[12px] leading-[16px] font-medium text-[#F5EBE5] text-right tabular-nums">
            ${data.feesUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Timeframe Toggle (hidden - only 30D is supported)
// ============================================
// interface TimeframeToggleProps {
//   value: Timeframe
//   onChange: (timeframe: Timeframe) => void
// }

// function TimeframeToggle({ value, onChange }: TimeframeToggleProps) {
//   const options: { value: Timeframe; label: string }[] = [
//     { value: '24h', label: '24H' },
//     { value: '1W', label: '1W' },
//     { value: '1M', label: '30D' },
//   ]

//   return (
//     <div className="bg-[#0B0909] rounded-[10px] p-0.5 flex items-center h-7">
//       {options.map((option) => {
//         const isActive = value === option.value
//         return (
//           <button
//             key={option.value}
//             onClick={() => onChange(option.value)}
//             className={`
//               relative h-full px-2 w-9 flex items-center justify-center
//               text-[10px] leading-[1.2] transition-colors
//               ${isActive
//                 ? 'text-[#F5EBE5]'
//                 : 'text-[#8E7571] hover:text-[#F5EBE5]/70'
//               }
//             `}
//           >
//             {isActive && (
//               <div className="absolute inset-0 bg-[#171312] border border-[#221C1B] rounded-lg" />
//             )}
//             <span className="relative z-10">{option.label}</span>
//           </button>
//         )
//       })}
//     </div>
//   )
// }

// ============================================
// Sandworm Illustration (empty state)
// ============================================
function SandwormIllustration() {
  return (
    <svg 
      width="120" 
      height="120" 
      viewBox="0 0 142 142" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="71" cy="71" r="70.5" fill="#171312" stroke="#EC9117"/>
      <path 
        d="M70.0596 71.5778C71.1856 77.9636 71.0428 84.5087 69.6393 90.8393C68.2358 97.17 65.5992 103.162 61.8799 108.474C58.1606 113.786 53.4315 118.313 47.9627 121.797C42.4938 125.281 36.3923 127.654 30.0065 128.78M69.8533 70.6473C63.5899 72.3256 57.0573 72.7538 50.6284 71.9074C44.1995 71.061 38.0003 68.9567 32.3846 65.7145C26.769 62.4723 21.847 58.1558 17.8996 53.0114C13.9522 47.867 11.0566 41.9955 9.37836 35.7321M70.7623 70.3607C68.5445 64.2674 67.5486 57.797 67.8315 51.3188C68.1143 44.8406 69.6703 38.4815 72.4107 32.6047C75.1512 26.7279 79.0223 21.4484 83.8031 17.0676C88.5838 12.6869 94.1807 9.2906 100.274 7.07283M71.127 71.2412C77.0038 68.5008 83.3629 66.9448 89.841 66.6619C96.3192 66.3791 102.79 67.375 108.883 69.5928C114.976 71.8105 120.573 75.2069 125.354 79.5876C130.135 83.9684 134.006 89.2479 136.746 95.1247M70.2816 71.6812C73.5238 77.2968 75.6281 83.4961 76.4745 89.9249C77.3209 96.3538 76.8928 102.886 75.2145 109.15C73.5362 115.413 70.6406 121.285 66.6932 126.429C62.7458 131.574 57.8238 135.89 52.2082 139.132M69.7695 70.8775C64.4579 74.5968 58.4656 77.2334 52.135 78.6369C45.8044 80.0403 39.2592 80.1832 32.8734 79.0572C26.4875 77.9312 20.386 75.5584 14.9172 72.0743C9.44835 68.5903 4.71924 64.0632 0.999992 58.7516M70.5257 70.2973C66.3576 65.33 63.2087 59.5904 61.2589 53.4062C59.309 47.222 58.5962 40.7142 59.1614 34.2545C59.7265 27.7948 61.5585 21.5097 64.5526 15.758C67.5468 10.0063 71.6445 4.90066 76.6117 0.73262M71.1695 71C75.7547 66.4149 81.198 62.7777 87.1888 60.2963C93.1795 57.8148 99.6004 56.5376 106.085 56.5376C112.569 56.5376 118.99 57.8149 124.981 60.2963C130.971 62.7778 136.415 66.4149 141 71M70.5256 71.7027C75.4929 75.8707 79.5906 80.9763 82.5848 86.728C85.5789 92.4797 87.4109 98.7649 87.976 105.225C88.5412 111.684 87.8284 118.192 85.8785 124.376C83.9286 130.56 80.7798 136.3 76.6117 141.267M69.7695 71.1225C66.0503 76.4341 61.3212 80.9612 55.8524 84.4453C50.3835 87.9293 44.282 90.3021 37.8961 91.4281C31.5103 92.5541 24.9652 92.4112 18.6346 91.0078C12.3039 89.6043 6.31165 86.9677 1.00001 83.2484M70.2817 70.3187C64.6661 67.0765 59.744 62.76 55.7966 57.6156C51.8492 52.4712 48.9537 46.5997 47.2754 40.3363C45.5971 34.0729 45.169 27.5402 46.0154 21.1114C46.8618 14.6825 48.9661 8.48325 52.2083 2.86766M71.127 70.7587C73.8674 64.8819 77.7385 59.6024 82.5193 55.2216C87.3 50.8409 92.8968 47.4446 98.9901 45.2268C105.083 43.009 111.554 42.0132 118.032 42.296C124.51 42.5788 130.869 44.1349 136.746 46.8753M70.7623 71.6392C76.8556 73.857 82.4524 77.2532 87.2332 81.634C92.0139 86.0148 95.8851 91.2943 98.6255 97.1711C101.366 103.048 102.922 109.407 103.205 115.885C103.488 122.363 102.492 128.834 100.274 134.927M69.8533 71.3527C68.175 77.6161 65.2795 83.4876 61.3321 88.632C57.3847 93.7763 52.4626 98.0929 46.847 101.335C41.2314 104.577 35.0321 106.682 28.6033 107.528C22.1744 108.374 15.6417 107.946 9.37836 106.268M70.0596 70.4222C63.6738 69.2962 57.5722 66.9234 52.1034 63.4394C46.6346 59.9554 41.9054 55.4283 38.1862 50.1166C34.4669 44.8049 31.8303 38.8126 30.4268 32.482C29.0234 26.1514 28.8805 19.6063 30.0065 13.2204M71.0045 70.5465C71.5697 64.0869 73.4016 57.8017 76.3958 52.0501C79.3899 46.2984 83.4876 41.1927 88.4549 37.0246C93.4222 32.8566 99.1619 29.7077 105.346 27.7579C111.53 25.808 118.038 25.0952 124.498 25.6604M70.963 71.4987C77.4473 71.4987 83.8682 72.7759 89.8589 75.2574C95.8496 77.7388 101.293 81.376 105.878 85.9611C110.463 90.5462 114.1 95.9896 116.582 101.98C119.063 107.971 120.341 114.392 120.341 120.876" 
        stroke="url(#paint0_radial_sandworm)"
      />
      <defs>
        <radialGradient 
          id="paint0_radial_sandworm" 
          cx="0" 
          cy="0" 
          r="1" 
          gradientUnits="userSpaceOnUse" 
          gradientTransform="translate(71 71) rotate(90) scale(70.2674 70)"
        >
          <stop offset="0.4" stopColor="#EC9117" stopOpacity="0"/>
          <stop offset="1" stopColor="#EC9117"/>
        </radialGradient>
      </defs>
    </svg>
  )
}

// ============================================
// Main Component
// ============================================
export interface FeesHistoryCardProps {
  data: FeesChartPoint[] | null
  token0Symbol?: string
  token1Symbol?: string
}

export function FeesHistoryCard({
  data,
  token0Symbol = 'Token0',
  token1Symbol = 'Token1',
}: FeesHistoryCardProps) {
  // Fixed to 30D only (API returns daily data)
  const timeframe: Timeframe = '1M'
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Filter data by timeframe (always 30D for now)
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return []

    const now = new Date()
    const cutoffDate = new Date()
    cutoffDate.setDate(now.getDate() - 30) // Fixed to 30 days

    return data.filter((point) => point.timestamp >= cutoffDate)
  }, [data])

  // Calculate total fees for the filtered timeframe
  const calculatedTotalFees = useMemo(() => {
    if (filteredData.length === 0) return 0
    return filteredData.reduce((sum, point) => sum + (point.feesUSD || 0), 0)
  }, [filteredData])

  // Format total fees for display
  const formattedTotalFees = useMemo(() => {
    return calculatedTotalFees.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }, [calculatedTotalFees])

  // Resample to target bar count
  const chartData = useMemo(() => {
    const targetCount = BAR_COUNTS[timeframe]
    return resampleData(filteredData, targetCount)
  }, [filteredData, timeframe])

  // Calculate X-axis labels (start, middle, end)
  const xAxisLabels = useMemo(() => {
    if (chartData.length === 0) return { start: '', middle: '', end: '' }

    const first = chartData[0]
    const last = chartData[chartData.length - 1]
    const midIndex = Math.floor(chartData.length / 2)
    const mid = chartData[midIndex]

    return {
      start: formatDateLabel(first.timestamp, timeframe),
      middle: formatDateLabel(mid.timestamp, timeframe),
      end: formatDateLabel(last.timestamp, timeframe),
    }
  }, [chartData, timeframe])

  // Empty state - "Data eaten by sandworms" design
  if (!data || data.length === 0 || calculatedTotalFees === 0) {
    return (
      <Card className="h-[260px] bg-[#171312] border-[#221C1B] text-white rounded-[16px] p-3 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-[2px]">
            <p 
              className="text-[12px] font-medium leading-[16px]"
              style={{ color: 'rgba(236, 145, 23, 0.4)' }}
            >
              30D Fees
            </p>
            <p 
              className="text-[16px] font-medium leading-[24px]"
              style={{ color: '#EC9117' }}
            >
              Data eaten by sandworms
            </p>
          </div>
          {/* No data badge */}
          <div 
            className="flex items-center justify-center px-1.5 py-px rounded-full"
            style={{ background: 'rgba(236, 145, 23, 0.15)' }}
          >
            <span 
              className="text-[10px] leading-[14px] text-center"
              style={{ color: '#EC9117' }}
            >
              No data
            </span>
          </div>
        </div>
        {/* Sandworm illustration */}
        <div className="flex-1 flex items-center justify-center">
          <SandwormIllustration />
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-[260px] bg-[#171312] border-[#221C1B] text-white rounded-[16px] p-3 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <p className="text-[12px] leading-[14px] text-[#8E7571]">
          30D Fees
        </p>
        <h3 className="text-base font-medium text-[#F5EBE5] leading-6">
          ${formattedTotalFees}
        </h3>
      </div>

      {/* Chart */}
      <div className="mt-3 flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <XAxis dataKey="date" hide />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip
              cursor={false}
              content={
                <FeesTooltip
                  token0Symbol={token0Symbol}
                  token1Symbol={token1Symbol}
                />
              }
            />
            <Bar
              dataKey="feesUSD"
              radius={[1, 1, 1, 1]}
              maxBarSize={6}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
            >
              {chartData.map((_, index) => {
                const isHovered = hoveredIndex === index
                const isAnyHovered = hoveredIndex !== null

                // Rest state: all bars wormbone
                // Hover state: active bar wormbone, others subtle
                let fill = COLORS.wormbone
                if (isAnyHovered && !isHovered) {
                  fill = COLORS.wormboneSubtle
                }

                // Active bar gets a muted background "track"
                const showTrack = isHovered

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fill}
                    stroke="none"
                    style={{
                      transition: 'fill 150ms ease-out',
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

