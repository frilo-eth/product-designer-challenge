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
// Desert Illustration (empty state)
// ============================================
function DesertIllustration() {
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 613 311" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMax slice"
    >
      <g clipPath="url(#clip0_desert_fees)">
        <path d="M-1 261.968V304.447C2.6654 303.056 6.3308 301.64 10.0208 300.232C34.916 290.897 164.123 241.872 189.027 232.536C194.439 230.98 199.31 227.868 204.722 227.086C244.418 219.43 281.949 209.271 319.259 194.411C321.153 192.139 322.441 189.143 322.728 185.068C293.741 182.795 263.22 190.839 236.152 172.595C227.247 176.497 217.948 179.354 207.977 181.956C172.184 192.477 33.0382 250.673 -0.9918 261.976L-1 261.968Z" fill="#221C1B"/>
        <path d="M403.916 209.963C381.727 194.403 357.906 192.847 333.552 184.285C329.657 182.993 326.098 183.849 322.679 185.529C311.215 193.061 305.86 200.66 297.283 203.739C266.648 216.318 233.61 220.854 204.959 238.694C201.532 240.826 198.153 243.14 195.538 246.219C192.922 249.298 191.118 253.241 191.331 257.283C191.397 258.559 191.684 259.877 192.495 260.856C193.16 261.663 194.111 262.165 195.054 262.626C207.28 268.603 221.204 269.904 234.783 270.398C285.352 272.234 336.102 265.376 386.179 259.201C397.29 257.835 408.393 256.394 419.529 255.275C422.948 254.929 426.384 254.558 429.82 254.46C430.984 254.427 433.92 255.102 434.912 254.731C437.29 253.842 432.304 254.484 434.912 254.731C459.036 258.444 592.5 316.204 614 330.034V275.197C602.217 271.534 486.047 244.202 473.739 241.082C449.385 234.858 426.646 224.74 403.916 209.954V209.963Z" fill="#EC9117" fillOpacity="0.15"/>
        <path d="M355.2 143.04C344.376 139.146 334.093 136.035 322.719 132.923C309.255 129.202 297.267 124.048 284.876 117.47C286.295 120.615 279.907 126.715 275.627 128.255C259.932 135.261 239.899 135.261 230.158 157.044C227.993 161.712 230.699 168.718 233.946 171.048C261.556 191.283 292.945 182.721 322.719 185.051C322.711 185.216 322.687 185.364 322.67 185.52C326.09 183.841 329.648 182.985 333.543 184.277C357.897 192.839 381.718 194.395 403.908 209.954C426.638 224.74 449.377 234.858 473.731 241.082C486.039 244.202 602.208 271.534 613.992 275.197V231.606C609.408 230.511 500.594 182.82 495.928 181.947C447.212 173.386 402.284 160.938 355.191 143.04H355.2Z" fill="#EC9117" fillOpacity="0.15"/>
        <path d="M364.941 19.3137C364.146 19.0585 363.359 19.0338 362.58 19.182C363.482 20.5239 364.482 21.7999 366.024 22.4256C370.895 24.7636 374.683 37.9851 372.518 38.7672C337.332 60.5587 301.072 71.4503 262.638 80.0122C256.144 81.5681 252.355 87.7919 257.767 94.7978C265.344 106.472 278.333 104.916 284.836 117.363C284.852 117.396 284.868 117.437 284.885 117.478C297.275 124.056 309.255 129.202 322.728 132.931C334.093 136.043 344.376 139.155 355.208 143.049C402.301 160.946 447.228 173.394 495.945 181.956C500.619 182.828 609.424 230.519 614.008 231.614V81.1565C610.991 80.4485 369.82 21.6435 364.95 19.3137H364.941Z" fill="#EC9117" fillOpacity="0.15"/>
        <path d="M80.7292 356C108.831 343.906 140.597 341.609 146.28 340.457C157.678 338.234 168.215 339.996 179.351 339.197C186.501 336.884 214.922 329.334 222.056 326.288C226.492 324.411 281.022 299.014 285.27 296.602C287.755 295.194 86.6496 339.337 32.0786 356H80.7374H80.7292Z" fill="#221C1B"/>
        <path d="M32.0788 356C86.6498 339.329 278.587 298.166 276.103 299.574C271.863 301.986 136.268 335.196 129.118 337.509C149.175 336.069 213.955 325.959 234.496 320.452C261.015 313.446 284.836 305.666 311.354 302.554C328.673 300.216 344.917 294.774 362.235 290.88C369.271 289.324 435.847 264.421 435.306 255.085C435.002 253.332 424.81 254.781 423.768 254.871C413.895 255.727 404.055 256.995 394.215 258.205C380.431 259.893 366.655 261.614 352.863 263.194C337.234 264.989 321.588 266.627 305.91 267.944C290.494 269.237 275.037 270.233 259.571 270.554C246.402 270.826 233.143 270.702 220.056 269.13C211.232 268.076 200.991 266.668 193.381 261.655C188.494 258.436 192.782 249.026 195.792 245.61C199.31 241.609 203.902 238.9 208.51 236.414C238.358 220.262 266.968 216.178 297.283 203.731C303.679 201.434 310.871 196.33 322.72 185.051C305.401 185.051 283.991 193.531 269.944 197.869C246.246 205.196 229.641 222.262 204.722 227.07C199.31 227.852 194.439 230.964 189.027 232.52C164.132 241.856 34.9242 290.897 10.0208 300.232C6.3308 301.648 2.6654 303.056 -1 304.447V356H32.0788Z" fill="#171312"/>
        <path d="M126.231 127.473C118.605 130.7 6.4948 181.141 -1 184.549V261.959C33.03 250.656 313.814 188.953 322.72 185.051C321.785 184.425 319.431 184.606 318.365 184.483C314.725 184.063 311.084 183.668 307.451 183.256C285.869 180.836 264.196 178.737 242.942 174.11C238.702 173.188 234.119 171.928 231.585 168.397C229.297 165.211 229.272 160.847 230.379 157.077C233.159 147.568 241.982 141.073 251.043 137.154C260.113 133.235 269.936 131.144 278.669 126.526C281.793 124.871 285.131 122.22 284.918 118.68C284.827 117.19 284.089 115.807 283.212 114.597C276.701 105.615 262.532 104.652 257.579 94.345C255.266 89.5372 258.866 84.3095 261.539 80.3414C258.76 80.7531 140.311 121.249 126.239 127.473H126.231Z" fill="#171312"/>
        <path d="M236.661 77.6741C191.848 94.7483 43.2636 143.806 -1 151.536V184.549C6.503 181.141 118.605 130.7 126.231 127.473C140.302 121.249 259.973 80.646 262.638 80.0039C264.188 79.6581 265.738 79.3041 267.288 78.9501C269.01 78.0034 270.715 77.0319 272.388 76.1099C270.715 77.0319 269.018 78.0034 267.288 78.9501C282.679 75.4266 297.734 71.4585 312.511 66.5107C306.566 67.8526 300.678 69.4909 294.577 71.442C274.553 77.6658 255.603 70.6599 236.661 77.6658V77.6741Z" fill="#221C1B"/>
        <path d="M366.024 22.4256C364.482 21.7917 363.482 20.5239 362.58 19.182C358.636 19.9065 15.3098 93.6864 -1 98.1732V151.536C43.2636 143.806 191.848 94.7484 236.661 77.6742C255.603 70.6683 274.553 77.6742 294.577 71.4504C300.678 69.4993 306.566 67.861 312.511 66.5191C332.978 59.6614 352.92 50.9102 372.526 38.7672C374.691 37.9851 370.903 24.7637 366.032 22.4256H366.024Z" fill="#171312"/>
        <path d="M614 356V311.659C582.045 304.439 459.037 258.452 434.912 254.74C437.29 253.85 432.305 254.493 434.912 254.74C435.15 254.838 435.281 254.954 435.306 255.094C435.847 264.429 369.271 289.333 362.236 290.889C344.917 294.783 328.673 300.224 311.355 302.562C284.836 305.674 261.015 313.454 234.496 320.46C202.557 329.022 178.219 334.233 146.289 340.457C140.614 341.609 108.839 343.906 80.7378 356H614.008H614Z" fill="#EC9117" fillOpacity="0.15"/>
      </g>
      <defs>
        <clipPath id="clip0_desert_fees">
          <rect width="615" height="356" fill="white" transform="translate(-1)"/>
        </clipPath>
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

  // Empty state - desert illustration design (matching Figma)
  if (!data || data.length === 0 || calculatedTotalFees === 0) {
    return (
      <Card className="h-[260px] bg-[#171312] border-[#221C1B] text-white rounded-[16px] p-3 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between flex-shrink-0 z-10">
          <div className="flex flex-col gap-[2px]">
            <p className="text-[12px] text-[#8E7571]">
              Fee data is unavailable
            </p>
            <p 
              className="text-[16px] font-bold leading-[25px]"
              style={{ color: '#EC9117' }}
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
              No Data
            </span>
          </div>
        </div>
        {/* Desert illustration - fills available space while maintaining ratio */}
        <div className="flex-1 w-full overflow-hidden rounded-b-[4px] mt-3">
          <DesertIllustration />
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-[260px] bg-[#171312] border-[#221C1B] text-white rounded-[16px] p-3 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <p className="text-[12px] text-[#8E7571]">
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

