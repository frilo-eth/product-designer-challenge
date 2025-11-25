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
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          gap: '20px',
          alignSelf: 'stretch',
          minHeight: '460px',
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
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        gap: '20px',
        alignSelf: 'stretch',
        minHeight: '460px',
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
        {hasChartData ? (
          <>
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
        </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-[14px]" style={{ color: COLORS.muted }}>
              No liquidity data available
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
