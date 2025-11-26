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
        {(shouldSwap ? data.fees1 : data.fees0) !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12px] leading-[16px] text-[#8E7571]">
              {token0Symbol}
            </span>
            <span className="text-[12px] leading-[16px] text-[#F5EBE5] text-right tabular-nums">
              {(shouldSwap ? data.fees1 : data.fees0)?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) ?? '—'}
            </span>
          </div>
        )}
        {(shouldSwap ? data.fees0 : data.fees1) !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12px] leading-[16px] text-[#8E7571]">
              {token1Symbol}
            </span>
            <span className="text-[12px] leading-[16px] text-[#F5EBE5] text-right tabular-nums">
              {(shouldSwap ? data.fees0 : data.fees1)?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) ?? '—'}
            </span>
          </div>
        )}

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
// Sandworm Illustration (empty state) - circular spiral
// ============================================
function SandwormIllustration() {
  return (
    <svg 
      width="120" 
      height="120" 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="60" cy="60" r="59.5" fill="#171312" stroke="#221C1B"/>
      <path 
        d="M59.2054 60.4883C60.157 65.8847 60.0363 71.4158 58.8503 76.7657C57.6642 82.1155 55.4361 87.1794 52.293 91.6681C49.15 96.1569 45.1535 99.9826 40.532 102.927C35.9104 105.871 30.7542 107.876 25.3577 108.828M59.0311 59.702C53.7381 61.1203 48.2176 61.4821 42.7847 60.7668C37.3519 60.0516 32.113 58.2733 27.3675 55.5334C22.6219 52.7935 18.4624 49.1457 15.1266 44.7984C11.7907 40.451 9.34378 35.4892 7.92553 30.1962M59.7993 59.4598C57.9251 54.3105 57.0835 48.8425 57.3225 43.368C57.5615 37.8935 58.8765 32.5196 61.1923 27.5533C63.5082 22.587 66.7796 18.1254 70.8197 14.4234C74.8597 10.7213 79.5894 7.85123 84.7387 5.97706M60.1075 60.2039C65.0738 57.8881 70.4476 56.5731 75.9222 56.3341C81.3967 56.0951 86.8647 56.9366 92.014 58.8108C97.1632 60.685 101.893 63.5551 105.933 67.2572C109.973 70.9592 113.244 75.4208 115.56 80.3871M59.3931 60.5757C62.1329 65.3213 63.9113 70.5601 64.6265 75.9929C65.3417 81.4258 64.9799 86.9463 63.5617 92.2394C62.1434 97.5324 59.6965 102.494 56.3606 106.842C53.0248 111.189 48.8653 114.837 44.1198 117.577M58.9603 59.8965C54.4716 63.0395 49.4077 65.2677 44.0579 66.4537C38.7081 67.6397 33.177 67.7605 27.7805 66.8089C22.384 65.8574 17.2278 63.8522 12.6062 60.9079C7.98467 57.9637 3.98824 54.1379 0.845215 49.6492M59.5993 59.4062C56.077 55.2085 53.416 50.3581 51.7682 45.132C50.1204 39.9059 49.5181 34.4064 49.9957 28.9475C50.4732 23.4886 52.0214 18.1772 54.5517 13.3167C57.0819 8.45609 60.5448 4.14143 64.7425 0.619141M60.1434 60C64.0182 56.1253 68.6182 53.0516 73.6808 50.9546C78.7434 48.8576 84.1695 47.7783 89.6493 47.7783C95.129 47.7783 100.555 48.8577 105.618 50.9547C110.68 53.0517 115.28 56.1253 119.155 60M59.5993 60.5938C63.797 64.1161 67.2598 68.4307 69.7901 73.2913C72.3203 78.1519 73.8685 83.4633 74.3461 88.9222C74.8237 94.3811 74.2213 99.8806 72.5735 105.107C70.9257 110.333 68.2647 115.183 64.7425 119.381M58.9603 60.1035C55.8173 64.5922 51.8209 68.418 47.1993 71.3622C42.5778 74.3065 37.4215 76.3117 32.0251 77.2632C26.6286 78.2148 21.0975 78.094 15.7477 76.908C10.3978 75.722 5.33394 73.4938 0.845227 70.3508M59.3931 59.4242C54.6476 56.6844 50.4881 53.0366 47.1522 48.6893C43.8164 44.3419 41.3695 39.38 39.9512 34.087C38.5329 28.794 38.1712 23.2735 38.8864 17.8406C39.6017 12.4078 41.38 7.16896 44.1198 2.4234M60.1075 59.7961C62.4233 54.8298 65.6947 50.3682 69.7347 46.6662C73.7748 42.9641 78.5045 40.094 83.6538 38.2198C88.8031 36.3457 94.2711 35.5041 99.7456 35.7431C105.22 35.9821 110.594 37.2971 115.56 39.6129M59.7993 60.5402C64.9485 62.4144 69.6782 65.2844 73.7183 68.9865C77.7584 72.6886 81.0298 77.1501 83.3456 82.1165C85.6615 87.0828 86.9764 92.4567 87.2154 97.9312C87.4544 103.406 86.6129 108.874 84.7387 114.023M59.0311 60.2981C57.6128 65.5911 55.1659 70.5529 51.8301 74.9003C48.4942 79.2476 44.3348 82.8954 39.5892 85.6353C34.8436 88.3752 29.6048 90.1535 24.1719 90.8687C18.7391 91.584 13.2185 91.2221 7.92552 89.8039M59.2055 59.5117C53.809 58.5602 48.6528 56.555 44.0312 53.6108C39.4097 50.6665 35.4132 46.8408 32.2702 42.3521C29.1271 37.8633 26.899 32.7994 25.713 27.4496C24.5269 22.0998 24.4062 16.5687 25.3578 11.1722M60.004 59.6168C60.4816 54.1579 62.0297 48.8466 64.5599 43.986C67.0902 39.1254 70.5531 34.8107 74.7508 31.2884C78.9485 27.7661 83.7989 25.1052 89.025 23.4574C94.2511 21.8096 99.7507 21.2073 105.21 21.6848M59.9688 60.4215C65.4486 60.4215 70.8746 61.5008 75.9373 63.5978C80.9999 65.6948 85.5999 68.7684 89.4747 72.6432C93.3494 76.518 96.423 81.118 98.52 86.1806C100.617 91.2432 101.696 96.6693 101.696 102.149" 
        stroke="url(#paint0_radial_sandworm)"
      />
      <defs>
        <radialGradient 
          id="paint0_radial_sandworm" 
          cx="0" 
          cy="0" 
          r="1" 
          gradientUnits="userSpaceOnUse" 
          gradientTransform="translate(60.0001 60) rotate(90) scale(59.3809 59.1549)"
        >
          <stop offset="0.4" stopColor="#221C1B" stopOpacity="0"/>
          <stop offset="1" stopColor="#221C1B"/>
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

  // Filter data by timeframe (fixed to 30D)
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return []

    const now = new Date()
    const cutoffDate = new Date()
    cutoffDate.setDate(now.getDate() - 30)

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

  // Empty state - sandworm illustration design (matching Figma node 33-2062)
  if (!data || data.length === 0 || calculatedTotalFees === 0) {
    return (
      <Card className="h-[260px] bg-[#171312] border-[#221C1B] text-white rounded-[16px] p-3 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between flex-shrink-0">
          <div className="flex flex-col gap-[2px]">
            <p 
              className="text-[12px] leading-[14px]"
              style={{ color: 'rgba(236, 145, 23, 0.15)' }}
            >
              Fee data unavailable
            </p>
            <p 
              className="text-[16px] font-bold leading-[25px]"
              style={{ color: '#8D560C' }}
            >
              Data eaten by sandworms
            </p>
          </div>
          {/* No data badge */}
          <div 
            className="flex items-center justify-center px-1.5 py-0.5 rounded-[6px]"
            style={{ background: 'rgba(236, 145, 23, 0.15)' }}
          >
            <span 
              className="text-[12px] font-normal leading-[16px]"
              style={{ color: '#EC9117' }}
            >
              No data
            </span>
          </div>
        </div>
        {/* Sandworm illustration - centered */}
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

