'use client'

import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { LiquidityPoint } from '@/lib/transformLiquidityProfile'

// ============================================
// Design Tokens
// ============================================
const COLORS = {
  surface: '#171312',
  background: '#0B0909',
  border: '#221C1B',
  wormbone: '#F5EBE5',
  wormboneSubtle: 'rgba(245, 235, 229, 0.15)',
  muted: '#8E7571',
  accent: '#3BE38B',
  accentBg: 'rgba(59, 227, 139, 0.1)',
  token0: '#2775CA',
  token1: '#103E36',
}

// ============================================
// Interfaces
// ============================================
export interface DistributionChartCardProps {
  // TVL data
  tvl?: number
  tvlChange?: number
  tvlChangePercent?: number
  isEarning?: boolean
  
  // Chart data
  chartData: LiquidityPoint[] | null
  leftBound: number
  rightBound: number
  currentPrice?: number
  currentPriceFormatted?: string // e.g., "0.0728 USDC"
  
  // Token info for tooltips
  token0Symbol?: string
  token1Symbol?: string
  
  loading?: boolean
}

export interface VaultSupportInfoCardProps {
  token0Symbol?: string
  token1Symbol?: string
  priceRatio?: number
  leftBound: number
  rightBound: number
  skewPercent?: number
  skewDirection?: 'bullish' | 'bearish' | 'neutral'
  status?: 'balanced' | 'unbalanced'
  statusTolerance?: number
  buyLimit?: number // Price impact buy limit %
  sellLimit?: number // Price impact sell limit %
  token0Percent?: number
  token1Percent?: number
  token0ValueUSD?: number
  token1ValueUSD?: number
  token0Color?: string
  token1Color?: string
  loading?: boolean
}

// ============================================
// Format Helpers
// ============================================
function formatCurrency(value: number, options?: { compact?: boolean }): string {
  if (options?.compact) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
    return value.toFixed(2)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(0)}%`
}

// ============================================
// Info Tooltip Component
// ============================================
function InfoTooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className=""
      >
        {children}
      </div>
      {show && (
        <div
          className="absolute left-0 top-full mt-2 z-50 min-w-[200px] max-w-[280px]"
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            padding: '10px 12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

// ============================================
// Current Price Tooltip (for green line)
// ============================================
function CurrentPriceTooltip({ 
  currentPrice, 
  currentPriceFormatted 
}: { 
  currentPrice?: number
  currentPriceFormatted?: string 
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.accent }} />
        <span className="text-[12px] font-medium" style={{ color: COLORS.wormbone }}>
          Current Price
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-semibold" style={{ color: COLORS.wormbone }}>
          {currentPriceFormatted || currentPrice?.toFixed(4) || '—'}
        </span>
        <span className="text-[11px]" style={{ color: COLORS.muted }}>
          The green bar indicates where the current market price sits within the liquidity distribution.
        </span>
      </div>
    </div>
  )
}

// ============================================
// Range Bound Tooltip (for dotted lines)
// ============================================
function RangeBoundTooltip({ 
  bound, 
  side 
}: { 
  bound: number
  side: 'left' | 'right' 
}) {
  const label = side === 'left' ? 'Lower Bound' : 'Upper Bound'
  const description = side === 'left' 
    ? 'Below this price, liquidity becomes unavailable for trading.'
    : 'Above this price, liquidity becomes unavailable for trading.'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-0.5" 
          style={{ 
            background: 'rgba(255,255,255,0.4)', 
            borderTop: '1px dashed rgba(255,255,255,0.4)' 
          }} 
        />
        <span className="text-[12px] font-medium" style={{ color: COLORS.wormbone }}>
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-semibold" style={{ color: COLORS.wormbone }}>
          {formatPercent(bound)} from current
        </span>
        <span className="text-[11px]" style={{ color: COLORS.muted }}>
          {description}
        </span>
      </div>
    </div>
  )
}

// ============================================
// Bar Chart Tooltip
// ============================================
function ChartTooltip({ 
  active, 
  payload,
  currentPriceFormatted,
  currentPriceValue,
  token0Symbol,
  token1Symbol,
}: any) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload as LiquidityPoint
  const isCurrentPrice = Math.abs(data.pct) < 3
  
  const liquidityFormatted = data.liquidity >= 1_000_000
    ? `$${(data.liquidity / 1_000_000).toFixed(2)}M`
    : data.liquidity >= 1000
    ? `$${(data.liquidity / 1000).toFixed(1)}K`
    : `$${data.liquidity.toFixed(0)}`

  // Calculate the actual price at this bar's percentage deviation
  const priceAtBar = currentPriceValue ? currentPriceValue * (1 + data.pct / 100) : null
  const priceAtBarFormatted = priceAtBar 
    ? priceAtBar >= 1 
      ? priceAtBar.toFixed(4) 
      : priceAtBar.toFixed(6)
    : '—'

  // If near current price, show enhanced tooltip matching Figma
  if (isCurrentPrice) {
    return (
      <div
        className="rounded-[8px] border shadow-lg min-w-[180px]"
        style={{
          background: COLORS.surface,
          borderColor: COLORS.border,
        }}
      >
        {/* Header */}
        <div 
          className="px-3 py-2 border-b"
          style={{ borderColor: COLORS.border }}
        >
          <span className="text-[12px] font-medium" style={{ color: COLORS.wormbone }}>
            Current Price
          </span>
        </div>
        {/* Content - Liquidity first, then Price */}
        <div className="px-3 py-2 flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px]" style={{ color: COLORS.muted }}>Liquidity</span>
            <span className="text-[14px] font-medium" style={{ color: COLORS.wormbone }}>
              {liquidityFormatted}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px]" style={{ color: COLORS.muted }}>Price at this level</span>
            <span className="text-[14px] font-medium" style={{ color: COLORS.wormbone }}>
              {currentPriceFormatted || '—'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-[8px] border shadow-lg min-w-[160px]"
      style={{
        background: COLORS.surface,
        borderColor: COLORS.border,
      }}
    >
      {/* Header - eyebrow showing % from current */}
      <div 
        className="px-3 py-2 border-b"
        style={{ borderColor: COLORS.border }}
      >
        <span className="text-[12px] font-medium" style={{ color: COLORS.wormbone }}>
          {formatPercent(data.pct)} from current
        </span>
      </div>
      {/* Content */}
      <div className="px-3 py-2 flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px]" style={{ color: COLORS.muted }}>Liquidity</span>
          <span className="text-[14px] font-medium" style={{ color: COLORS.wormbone }}>
            {liquidityFormatted}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px]" style={{ color: COLORS.muted }}>Price at this level</span>
          <span className="text-[14px] font-medium" style={{ color: COLORS.wormbone }}>
            {priceAtBarFormatted} {token1Symbol} per {token0Symbol}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Earning Badge - matches Figma exactly
// ============================================
function EarningBadge() {
  return (
    <div
      className="px-2 py-1 rounded-[6px] text-[12px] font-normal"
      style={{
        background: 'rgba(0, 188, 125, 0.12)',
        color: '#00BC7D',
      }}
    >
      Earning
    </div>
  )
}

// ============================================
// No Data Badge - for empty states
// ============================================
function NoDataBadge() {
  return (
    <div
      className="px-1.5 py-0.5 rounded-[6px] text-[12px] font-normal"
      style={{
        background: 'rgba(236, 145, 23, 0.15)',
        color: '#EC9117',
      }}
    >
      No Data
    </div>
  )
}

// ============================================
// Desert Illustration (TVL empty state)
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
      <g clipPath="url(#clip0_desert)">
        <path d="M-1 261.968V304.447C2.6654 303.056 6.3308 301.64 10.0208 300.232C34.916 290.897 164.123 241.872 189.027 232.536C194.439 230.98 199.31 227.868 204.722 227.086C244.418 219.43 281.949 209.271 319.259 194.411C321.153 192.139 322.441 189.143 322.728 185.068C293.741 182.795 263.22 190.839 236.152 172.595C227.247 176.497 217.948 179.354 207.977 181.956C172.184 192.477 33.0382 250.673 -0.9918 261.976L-1 261.968Z" fill="#221C1B"/>
        <path d="M403.916 209.963C381.727 194.403 357.906 192.847 333.552 184.285C329.657 182.993 326.098 183.849 322.679 185.529C311.215 193.061 305.86 200.66 297.283 203.739C266.648 216.318 233.61 220.854 204.959 238.694C201.532 240.826 198.153 243.14 195.538 246.219C192.922 249.298 191.118 253.241 191.331 257.283C191.397 258.559 191.684 259.877 192.495 260.856C193.16 261.663 194.111 262.165 195.054 262.626C207.28 268.603 221.204 269.904 234.783 270.398C285.352 272.234 336.102 265.376 386.179 259.201C397.29 257.835 408.393 256.394 419.529 255.275C422.948 254.929 426.384 254.558 429.82 254.46C430.984 254.427 433.92 255.102 434.912 254.731C437.29 253.842 432.304 254.484 434.912 254.731C459.036 258.444 592.5 316.204 614 330.034V275.197C602.217 271.534 486.047 244.202 473.739 241.082C449.385 234.858 426.646 224.74 403.916 209.954V209.963Z" fill="#EC9117" fillOpacity="0.15"/>
        <path d="M355.2 143.04C344.376 139.146 334.093 136.035 322.719 132.923C309.255 129.202 297.267 124.048 284.876 117.47C286.295 120.615 279.907 126.715 275.627 128.255C259.932 135.261 239.899 135.261 230.158 157.044C227.993 161.712 230.699 168.718 233.946 171.048C261.556 191.283 292.945 182.721 322.719 185.051C322.711 185.216 322.687 185.364 322.67 185.52C326.09 183.841 329.648 182.985 333.543 184.277C357.897 192.839 381.718 194.395 403.908 209.954C426.638 224.74 449.377 234.858 473.731 241.082C486.039 244.202 602.208 271.534 613.992 275.197V231.606C609.408 230.511 500.594 182.82 495.928 181.947C447.212 173.386 402.284 160.938 355.191 143.04H355.2Z" fill="#EC9117" fillOpacity="0.15"/>
        <path d="M364.941 19.3137C364.146 19.0585 363.359 19.0338 362.58 19.182C363.482 20.5239 364.482 21.7999 366.024 22.4256C370.895 24.7636 374.683 37.9851 372.518 38.7672C337.332 60.5587 301.072 71.4503 262.638 80.0122C256.144 81.5681 252.355 87.7919 257.767 94.7978C265.344 106.472 278.333 104.916 284.836 117.363C284.852 117.396 284.868 117.437 284.885 117.478C297.275 124.056 309.255 129.202 322.728 132.931C334.093 136.043 344.376 139.155 355.208 143.049C402.301 160.946 447.228 173.394 495.945 181.956C500.619 182.828 609.424 230.519 614.008 231.614V81.1565C610.991 80.4485 369.82 21.6435 364.95 19.3137H364.941Z" fill="#EC9117" fillOpacity="0.15"/>
        <path d="M80.7292 356C108.831 343.906 140.597 341.609 146.28 340.457C157.678 338.234 168.215 339.996 179.351 339.197C186.501 336.884 214.922 329.334 222.056 326.288C226.492 324.411 281.022 299.014 285.27 296.602C287.755 295.194 86.6496 339.337 32.0786 356H80.7374H80.7292Z" fill="#221C1B"/>
        <path d="M32.0788 356C86.6498 339.329 278.587 298.166 276.103 299.574C271.863 301.986 136.268 335.196 129.118 337.509C149.175 336.069 213.955 325.959 234.496 320.452C261.015 313.446 284.836 305.666 311.354 302.554C328.673 300.216 344.917 294.774 362.235 290.88C369.271 289.324 435.847 264.421 435.306 255.085C435.002 253.332 424.81 254.781 423.768 254.871C413.895 255.727 404.055 256.995 394.215 258.205C380.431 259.893 366.655 261.614 352.863 263.194C337.234 264.989 321.588 266.627 305.91 267.944C290.494 269.237 275.037 270.233 259.571 270.554C246.402 270.826 233.143 270.702 220.056 269.13C211.232 268.076 200.991 266.668 193.381 261.655C188.494 258.436 192.782 249.026 195.792 245.61C199.31 241.609 203.902 238.9 208.51 236.414C238.358 220.262 266.968 216.178 297.283 203.731C303.679 201.434 310.871 196.33 322.72 185.051C305.401 185.051 283.991 193.531 269.944 197.869C246.246 205.196 229.641 222.262 204.722 227.07C199.31 227.852 194.439 230.964 189.027 232.52C164.132 241.856 34.9242 290.88 10.0208 300.216C6.3308 301.632 2.6654 303.04 -1 304.431V355.991H32.0788V356Z" fill="#171312"/>
        <path d="M126.231 127.473C118.605 130.7 6.4948 181.141 -1 184.549V261.959C33.03 250.656 313.814 188.953 322.72 185.051C321.785 184.425 319.431 184.606 318.365 184.483C314.725 184.063 311.084 183.668 307.451 183.256C285.869 180.836 264.196 178.737 242.942 174.11C238.702 173.188 234.119 171.928 231.585 168.397C229.297 165.211 229.272 160.847 230.379 157.077C233.159 147.568 241.982 141.073 251.043 137.154C260.113 133.235 269.936 131.144 278.669 126.526C281.793 124.871 285.131 122.22 284.918 118.68C284.827 117.19 284.089 115.807 283.212 114.597C276.701 105.615 262.532 104.652 257.579 94.345C255.266 89.5372 258.866 84.3095 261.539 80.3414C258.76 80.7531 140.311 121.249 126.239 127.473H126.231Z" fill="#171312"/>
        <path d="M236.661 77.6741C191.848 94.7483 43.2636 143.806 -1 151.536V184.549C6.503 181.141 118.605 130.7 126.231 127.473C140.302 121.249 259.973 80.646 262.638 80.0039C264.188 79.6581 265.738 79.3041 267.288 78.9501C269.01 78.0034 270.715 77.0319 272.388 76.1099C270.715 77.0319 269.018 78.0034 267.288 78.9501C282.679 75.4266 297.734 71.4585 312.511 66.5107C306.566 67.8526 300.678 69.4909 294.577 71.442C274.553 77.6658 255.603 70.6599 236.661 77.6658V77.6741Z" fill="#221C1B"/>
        <path d="M366.024 22.4256C364.482 21.7917 363.482 20.5239 362.58 19.182C358.636 19.9065 15.3098 93.6864 -1 98.1732V151.536C43.2636 143.806 191.848 94.7484 236.661 77.6742C255.603 70.6683 274.553 77.6742 294.577 71.4504C300.678 69.4993 306.566 67.861 312.511 66.5191C332.978 59.6614 352.92 50.9102 372.526 38.7672C374.691 37.9851 370.903 24.7637 366.032 22.4256H366.024Z" fill="#171312"/>
        <path d="M614 356V311.659C582.045 304.439 459.037 258.452 434.912 254.74C437.29 253.85 432.305 254.493 434.912 254.74C435.15 254.838 435.281 254.954 435.306 255.094C435.847 264.429 369.271 289.333 362.236 290.889C344.917 294.783 328.673 300.224 311.355 302.562C284.836 305.674 261.015 313.454 234.496 320.46C202.557 329.022 178.219 334.233 146.289 340.457C140.614 341.609 108.839 343.906 80.7378 356H614.008H614Z" fill="#EC9117" fillOpacity="0.15"/>
      </g>
      <defs>
        <clipPath id="clip0_desert">
          <rect width="615" height="356" fill="white" transform="translate(-1)"/>
        </clipPath>
      </defs>
    </svg>
  )
}

// ============================================
// Price Switcher Icon
// ============================================
function PriceSwitcherIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9.91663 6.41667L12.25 4.08333L9.91663 1.75" stroke="#8E7571" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.25 4.08325H5.25" stroke="#8E7571" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.08333 12.2499L1.75 9.91659L4.08333 7.58325" stroke="#8E7571" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.75 9.91675H1.75" stroke="#8E7571" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ============================================
// Token Icon Component - uses SVGs from public folder
// ============================================
function TokenIcon({ symbol, size = 16 }: { symbol: string; size?: number }) {
  // Map symbol to SVG file path
  const symbolToFile: Record<string, string> = {
    USDC: '/assets/icons/tokens/usdc.svg',
    ETH: '/assets/icons/tokens/eth.svg',
    WETH: '/assets/icons/tokens/weth.svg',
    VSN: '/assets/icons/tokens/vsn.svg',
    MORPHO: '/assets/icons/tokens/morpho.svg',
    USDT: '/assets/icons/tokens/usdt.svg',
    FOLKS: '/assets/icons/tokens/folks.svg',
    WOO: '/assets/icons/tokens/woo.svg',
  }

  const filePath = symbolToFile[symbol.toUpperCase()]

  if (filePath) {
    return (
      <img 
        src={filePath} 
        alt={symbol} 
        width={size} 
        height={size}
        className="rounded-full"
      />
    )
  }

  // Fallback to colored circle with letter
  return (
    <div
      className="rounded-full flex items-center justify-center text-[8px] font-bold text-white bg-white/20"
      style={{ 
        width: size, 
        height: size, 
        fontSize: size * 0.5,
      }}
    >
      {symbol.charAt(0)}
    </div>
  )
}

// ============================================
// Support Info Card (Separate Component)
// ============================================
export function VaultSupportInfoCard({
  token0Symbol = 'USDC',
  token1Symbol = 'VSN',
  priceRatio,
  leftBound,
  rightBound,
  skewPercent,
  skewDirection = 'neutral',
  status = 'balanced',
  statusTolerance = 2,
  buyLimit,
  sellLimit,
  token0Percent = 50,
  token1Percent = 50,
  token0ValueUSD,
  token1ValueUSD,
  token0Color = COLORS.token0,
  token1Color = COLORS.token1,
  loading,
}: VaultSupportInfoCardProps) {
  const [priceInverted, setPriceInverted] = useState(false)

  const displayPrice = priceRatio
    ? priceInverted
      ? (1 / priceRatio).toFixed(4)
      : priceRatio.toFixed(4)
    : '—'

  const priceLabel = priceInverted
    ? `${token0Symbol} per ${token1Symbol}`
    : `${token1Symbol} per ${token0Symbol}`

  // Range classification with descriptions (Wide > 100%, Narrow 20-100%, Tight < 20%)
  const rangeSpan = Math.abs(rightBound) + Math.abs(leftBound)
  const rangeClass = rangeSpan > 100 ? 'Wide' : rangeSpan > 20 ? 'Narrow' : 'Tight'
  
  const rangeTooltipContent: Record<string, string> = {
    Wide: 'Covers a broad span of prices. High uptime, lower fee concentration.',
    Narrow: 'Covers a small price band. Higher fee concentration, more frequent rebalancing.',
    Tight: 'Highly focused price band. Maximum fee concentration but minimal buffer.',
  }

  // Skew tooltip content - simplified per spec
  const skewTooltipContent: Record<string, string> = {
    bullish: 'More liquidity placed above the current price.',
    bearish: 'More liquidity placed below the current price.',
    neutral: 'Liquidity distributed evenly.',
  }

  // Skew label and color
  const skewLabel = skewDirection === 'bullish' ? '↗ Bullish' : skewDirection === 'bearish' ? '↘ Bearish' : '→ Neutral'
  const skewColor = skewDirection === 'bullish' ? COLORS.accent : skewDirection === 'bearish' ? '#FF5C5C' : COLORS.muted

  // Status display - map status to display label
  const statusDisplayLabel = status === 'balanced' ? 'Balanced' : status === 'unbalanced' ? 'Rebalancing' : 'Out of Range'
  
  // Status tooltip content per spec
  const statusTooltipMap: Record<string, string> = {
    balanced: 'Composition is within the target tolerance.',
    unbalanced: 'Composition moved outside tolerance. System is restoring target balance.',
    outOfRange: 'Price left the active range. Liquidity is no longer earning fees until re-entry.',
  }
  const statusTooltipContent = statusTooltipMap[status] || statusTooltipMap.balanced

  // Tolerance tooltip
  const toleranceTooltip = 'Allowed drift around the target balance before rebalancing triggers.'

  if (loading) {
    return (
      <div
        className="rounded-[16px] border h-full"
        style={{
          display: 'flex',
          padding: '16px',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          gap: '20px',
          alignSelf: 'stretch',
          background: COLORS.surface,
          borderColor: COLORS.border,
        }}
      >
        {/* Current Price skeleton - larger value */}
        <div className="flex flex-col self-stretch" style={{ gap: '2px' }}>
          <div className="h-[16px] w-20 rounded bg-white/10 animate-pulse" />
          <div className="h-[28px] w-24 rounded bg-white/10 animate-pulse" />
          <div className="h-[20px] w-28 rounded bg-white/10 animate-pulse" />
        </div>
        {/* Price Range skeleton */}
        <div className="flex flex-col self-stretch" style={{ gap: '2px' }}>
          <div className="h-[16px] w-20 rounded bg-white/10 animate-pulse" />
          <div className="h-[22px] w-32 rounded bg-white/10 animate-pulse" />
          <div className="h-[20px] w-12 rounded bg-white/10 animate-pulse" />
        </div>
        {/* Skew skeleton */}
        <div className="flex flex-col self-stretch" style={{ gap: '2px' }}>
          <div className="h-[16px] w-12 rounded bg-white/10 animate-pulse" />
          <div className="h-[22px] w-16 rounded bg-white/10 animate-pulse" />
          <div className="h-[20px] w-14 rounded bg-white/10 animate-pulse" />
        </div>
        {/* Status skeleton */}
        <div className="flex flex-col self-stretch" style={{ gap: '2px' }}>
          <div className="h-[16px] w-14 rounded bg-white/10 animate-pulse" />
          <div className="h-[22px] w-24 rounded bg-white/10 animate-pulse" />
          <div className="h-[20px] w-28 rounded bg-white/10 animate-pulse" />
        </div>
        {/* Live Composition skeleton */}
        <div className="flex flex-col self-stretch" style={{ gap: '2px' }}>
          <div className="h-[16px] w-28 rounded bg-white/10 animate-pulse" />
          <div className="flex justify-between self-stretch">
            <div className="h-[22px] w-12 rounded bg-white/10 animate-pulse" />
            <div className="h-[22px] w-12 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="h-2 rounded-full bg-white/10 animate-pulse self-stretch mt-1" />
          <div className="flex justify-between self-stretch mt-1">
            <div className="h-[20px] w-16 rounded bg-white/10 animate-pulse" />
            <div className="h-[20px] w-16 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-[16px] border h-full"
      style={{
        display: 'flex',
        padding: '16px',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        gap: '20px',
        alignSelf: 'stretch',
        background: COLORS.surface,
        borderColor: COLORS.border,
      }}
    >
      {/* Current Price - Trio Pattern */}
      <div 
        className="flex flex-col justify-center items-start self-stretch"
        style={{ gap: '2px' }}
      >
        <span 
          className="leading-[16px]"
          style={{ 
            color: COLORS.muted,
            fontSize: '12px',
            fontWeight: 400,
          }}
        >
          Current Price
        </span>
        <span 
          className="leading-[28px]"
          style={{ 
            color: COLORS.wormbone,
            fontSize: '20px',
            fontWeight: 500,
          }}
        >
          {displayPrice}
        </span>
        <button
          onClick={() => setPriceInverted(!priceInverted)}
          className="flex items-center gap-1 leading-[20px] hover:opacity-80 transition-opacity w-fit"
          style={{ 
            color: COLORS.muted,
            fontSize: '14px',
            fontWeight: 400,
          }}
        >
          <PriceSwitcherIcon />
          {priceLabel}
        </button>
      </div>

      {/* Price Range - Trio Pattern */}
      <div 
        className="flex flex-col justify-center items-start self-stretch"
        style={{ gap: '2px' }}
      >
        <span 
          className="leading-[16px]"
          style={{ 
            color: COLORS.muted,
            fontSize: '12px',
            fontWeight: 400,
          }}
        >
          Price range
        </span>
        <span 
          className="leading-[22px]"
          style={{ 
            color: COLORS.wormbone,
            fontSize: '16px',
            fontWeight: 500,
          }}
        >
          {leftBound.toFixed(0)}% — +{rightBound.toFixed(0)}%
        </span>
        <InfoTooltip
          content={
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium" style={{ color: COLORS.wormbone }}>
                {rangeClass} Range
              </span>
              <span className="text-[11px]" style={{ color: COLORS.muted }}>
                {rangeTooltipContent[rangeClass as keyof typeof rangeTooltipContent]}
              </span>
            </div>
          }
        >
          <span 
            className="leading-[20px] "
            style={{ 
              color: COLORS.muted,
              fontSize: '14px',
              fontWeight: 400,
            }}
          >
            {rangeClass}
          </span>
        </InfoTooltip>
      </div>

      {/* Skew - Trio Pattern */}
      <div 
        className="flex flex-col justify-center items-start self-stretch"
        style={{ gap: '2px' }}
      >
        <span 
          className="leading-[16px]"
          style={{ 
            color: COLORS.muted,
            fontSize: '12px',
            fontWeight: 400,
          }}
        >
          Skew
        </span>
        <span 
          className="leading-[22px]"
          style={{ 
            color: COLORS.wormbone,
            fontSize: '16px',
            fontWeight: 500,
          }}
        >
          {skewPercent?.toFixed(2) || '0.00'}%
        </span>
        <InfoTooltip
          content={
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium" style={{ color: skewColor }}>
                {skewLabel}
              </span>
              <span className="text-[11px]" style={{ color: COLORS.muted }}>
                {skewTooltipContent[skewDirection]}
              </span>
            </div>
          }
        >
          <span 
            className="leading-[20px] " 
            style={{ 
              color: skewColor,
              fontSize: '14px',
              fontWeight: 400,
            }}
          >
            {skewLabel}
          </span>
        </InfoTooltip>
      </div>

      {/* Status - Trio Pattern */}
      <div 
        className="flex flex-col justify-center items-start self-stretch"
        style={{ gap: '2px' }}
      >
        <span 
          className="leading-[16px]"
          style={{ 
            color: COLORS.muted,
            fontSize: '12px',
            fontWeight: 400,
          }}
        >
          Status
        </span>
        <InfoTooltip
          content={
            <span className="text-[11px]" style={{ color: COLORS.muted }}>
              {statusTooltipContent}
            </span>
          }
        >
          <span 
            className="leading-[22px] "
            style={{ 
              color: COLORS.wormbone,
              fontSize: '16px',
              fontWeight: 500,
            }}
          >
            {statusDisplayLabel}
          </span>
        </InfoTooltip>
        <InfoTooltip
          content={
            <div className="flex flex-col gap-1">
              <span className="text-[11px]" style={{ color: COLORS.muted }}>
                {toleranceTooltip}
              </span>
              {(buyLimit !== undefined || sellLimit !== undefined) && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px]" style={{ color: COLORS.accent }}>
                    Buy: {buyLimit?.toFixed(2) || statusTolerance}%
                  </span>
                  <span className="text-[10px]" style={{ color: '#FF5C5C' }}>
                    Sell: {sellLimit?.toFixed(2) || statusTolerance}%
                  </span>
                </div>
              )}
            </div>
          }
        >
          <span 
            className="leading-[20px] "
            style={{ 
              color: COLORS.muted,
              fontSize: '14px',
              fontWeight: 400,
            }}
          >
            +/-{statusTolerance}% Tolerance
          </span>
        </InfoTooltip>
      </div>

      {/* Live Composition - Trio Pattern with composition bar */}
      <div 
        className="flex flex-col justify-center items-start self-stretch"
        style={{ gap: '2px' }}
      >
        <span 
          className="leading-[16px]"
          style={{ 
            color: COLORS.muted,
            fontSize: '12px',
            fontWeight: 400,
          }}
        >
          Live Composition
        </span>
        
        {/* Percentage labels - main value */}
        <div className="flex items-center justify-between self-stretch">
          <span 
            className="leading-[22px]"
            style={{ 
              color: COLORS.wormbone,
              fontSize: '16px',
              fontWeight: 500,
            }}
          >
            {token0Percent}%
          </span>
          <span 
            className="leading-[22px]"
            style={{ 
              color: COLORS.wormbone,
              fontSize: '16px',
              fontWeight: 500,
            }}
          >
            {token1Percent}%
          </span>
        </div>

        {/* Composition bar */}
        <div className="h-2 rounded-full overflow-hidden flex self-stretch mt-1">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${token0Percent}%`,
              backgroundColor: token0Color,
            }}
          />
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${token1Percent}%`,
              backgroundColor: token1Color,
            }}
          />
        </div>

        {/* Token values with icons - support text with tooltips */}
        <div className="flex items-center justify-between self-stretch mt-1">
          <InfoTooltip
            content={
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium" style={{ color: COLORS.wormbone }}>
                  {token0Symbol} Balance
                </span>
                <span className="text-[11px]" style={{ color: COLORS.muted }}>
                  USD value: {token0ValueUSD ? formatCurrency(token0ValueUSD) : '—'}
                </span>
              </div>
            }
          >
            <div className="flex items-center gap-1.5 ">
              <TokenIcon symbol={token0Symbol} size={16} />
              <span 
                className="leading-[20px]"
                style={{ 
                  color: COLORS.muted,
                  fontSize: '14px',
                  fontWeight: 400,
                }}
              >
                {token0ValueUSD ? formatCurrency(token0ValueUSD, { compact: true }) : '—'}
              </span>
            </div>
          </InfoTooltip>
          <InfoTooltip
            content={
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium" style={{ color: COLORS.wormbone }}>
                  {token1Symbol} Balance
                </span>
                <span className="text-[11px]" style={{ color: COLORS.muted }}>
                  USD value: {token1ValueUSD ? formatCurrency(token1ValueUSD) : '—'}
                </span>
              </div>
            }
          >
            <div className="flex items-center gap-1.5 ">
              <span 
                className="leading-[20px]"
                style={{ 
                  color: COLORS.muted,
                  fontSize: '14px',
                  fontWeight: 400,
                }}
              >
                {token1ValueUSD ? formatCurrency(token1ValueUSD, { compact: true }) : '—'}
              </span>
              <TokenIcon symbol={token1Symbol} size={16} />
            </div>
          </InfoTooltip>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Loading State
// ============================================
function LoadingState() {
  return (
    <div
      className="rounded-[16px] border h-full flex flex-col overflow-hidden"
      style={{
        padding: '12px',
        gap: '12px',
        background: COLORS.surface,
        borderColor: COLORS.border,
      }}
    >
      <div className="space-y-2 flex-shrink-0">
        <div className="h-3 w-12 rounded bg-white/10 animate-pulse" />
        <div className="h-9 w-48 rounded bg-white/10 animate-pulse" />
        <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
      </div>
      <div className="flex-1 flex items-end justify-between gap-1 px-2 min-h-[200px]">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="w-[6px] rounded-t bg-white/10 animate-pulse"
            style={{
              height: `${20 + Math.random() * 60}%`,
              animationDelay: `${i * 25}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================
// Main Distribution Chart Component
// ============================================
export function DistributionChartCard({
  tvl,
  tvlChange,
  tvlChangePercent,
  isEarning = true,
  chartData,
  leftBound,
  rightBound,
  currentPrice,
  currentPriceFormatted,
  token0Symbol = 'Token0',
  token1Symbol = 'Token1',
  loading,
}: DistributionChartCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Format TVL - slightly smaller than before (36px instead of 48px)
  const formattedTVL = useMemo(() => {
    if (!tvl) return { dollars: '$0', cents: '00' }
    const formatted = formatCurrency(tvl)
    const [dollars, cents] = formatted.split('.')
    return { dollars, cents: cents || '00' }
  }, [tvl])

  // Format TVL change
  const formattedChange = useMemo(() => {
    if (!tvlChange || !tvlChangePercent) return null
    const sign = tvlChange >= 0 ? '↗' : '↘'
    const amount = formatCurrency(Math.abs(tvlChange))
    const percent = `(${tvlChangePercent >= 0 ? '+' : ''}${tvlChangePercent.toFixed(0)}%)`
    return { sign, amount, percent, isPositive: tvlChange >= 0 }
  }, [tvlChange, tvlChangePercent])

  // Generate exactly 7 X-axis ticks
  const xAxisTicks = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return [-60, -40, -20, 0, 20, 40, 60]
    }
    const minPct = chartData[0].pct
    const maxPct = chartData[chartData.length - 1].pct
    const step = (maxPct - minPct) / 6
    const ticks: number[] = []
    for (let i = 0; i <= 6; i++) {
      ticks.push(Math.round(minPct + i * step))
    }
    return ticks
  }, [chartData])

  if (loading) {
    return <LoadingState />
  }

  const hasChartData = chartData && chartData.length > 0
  const hasTVL = tvl !== undefined && tvl > 0

  // Empty state - desert illustration with "What is abundant, can still be hidden"
  // Show when no chart data OR when TVL is 0/undefined
  if (!hasChartData || !hasTVL) {
    return (
      <div
        className="rounded-[16px] border h-full flex flex-col overflow-hidden"
        style={{
          padding: '12px',
          background: COLORS.surface,
          borderColor: COLORS.border,
        }}
      >
        {/* Header for empty state */}
        <div className="flex items-start justify-between flex-shrink-0 z-10">
          <div className="flex flex-col gap-[2px]">
            <span 
              className="text-[12px] leading-[14px] text-[#8E7571]"
            >
              Liquidity data is unavailable
            </span>
            <span 
              className="text-[16px] font-bold leading-[25px]"
              style={{ color: '#EC9117' }}
            >
              What is abundant, can still be hidden
            </span>
          </div>
          <NoDataBadge />
        </div>
        
        {/* Desert illustration - positioned at bottom */}
        <div className="flex-1 w-full overflow-hidden rounded-b-[4px] mt-3">
          <DesertIllustration />
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-[16px] border h-full flex flex-col overflow-hidden"
      style={{
        padding: '12px',
        gap: '12px',
        background: COLORS.surface,
        borderColor: COLORS.border,
      }}
    >
      {/* Header: TVL + Badge */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div className="flex flex-col gap-1">
          <span className="text-[12px]" style={{ color: COLORS.muted }}>
            TVL
          </span>
          <div className="flex items-baseline gap-0.5">
            <span
              className="text-[32px] sm:text-[36px] font-semibold tracking-tight leading-none"
              style={{ color: COLORS.wormbone }}
            >
              {formattedTVL.dollars}
            </span>
            <span
              className="text-[16px] sm:text-[18px] font-medium tracking-tight"
              style={{ color: COLORS.muted }}
            >
              .{formattedTVL.cents}
            </span>
          </div>
          {formattedChange && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="text-[14px] font-medium"
                style={{ color: formattedChange.isPositive ? COLORS.accent : '#FF5C5C' }}
              >
                {formattedChange.sign} {formattedChange.amount}
              </span>
              <span
                className="text-[14px] font-normal"
                style={{ color: COLORS.muted }}
              >
                30D
              </span>
            </div>
          )}
        </div>
        {isEarning && <EarningBadge />}
      </div>

      {/* Chart - fills remaining height */}
      <div className="w-full flex-1 min-h-[200px] flex flex-col">
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 0, bottom: 0, left: 0 }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Left bound dotted line */}
              <ReferenceLine
                x={leftBound}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1}
                strokeDasharray="4 4"
                label={{
                  value: formatPercent(leftBound),
                  position: 'top',
                  fill: COLORS.muted,
                  fontSize: 10,
                }}
              />
              
              {/* Right bound dotted line */}
              <ReferenceLine
                x={rightBound}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1}
                strokeDasharray="4 4"
                label={{
                  value: formatPercent(rightBound),
                  position: 'top',
                  fill: COLORS.muted,
                  fontSize: 10,
                }}
              />

              {/* Current price reference line (green, solid) */}
              <ReferenceLine
                x={0}
                stroke={COLORS.accent}
                strokeWidth={2}
                strokeDasharray="0"
              />
              
              <XAxis dataKey="pct" hide />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                cursor={false}
                content={
                  <ChartTooltip 
                    currentPriceFormatted={currentPriceFormatted}
                    currentPriceValue={currentPrice}
                    token0Symbol={token0Symbol}
                    token1Symbol={token1Symbol}
                  />
                }
              />
              <Bar
                dataKey="liquidity"
                radius={[2, 2, 0, 0]}
                maxBarSize={12}
                onMouseEnter={(_, index) => setHoveredIndex(index)}
              >
                {chartData.map((entry, index) => {
                  const isHovered = hoveredIndex === index
                  const isAnyHovered = hoveredIndex !== null
                  const isCurrentPrice = Math.abs(entry.pct) < 3 // Near 0%

                  // Color logic: current price bar is green, others are cream/white
                  let fill = isCurrentPrice ? COLORS.accent : COLORS.wormbone
                  if (isAnyHovered && !isHovered) {
                    fill = isCurrentPrice
                      ? 'rgba(59, 227, 139, 0.3)'
                      : COLORS.wormboneSubtle
                  }

                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fill}
                      style={{ transition: 'fill 150ms ease-out' }}
                    />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
        {/* X-axis labels - rendered outside chart for better space utilization */}
        <div className="flex justify-between px-1 mt-1 flex-shrink-0">
          {xAxisTicks.map((tick, i) => (
            <span 
              key={i} 
              className="text-[10px]" 
              style={{ color: COLORS.muted }}
            >
              {formatPercent(tick)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
