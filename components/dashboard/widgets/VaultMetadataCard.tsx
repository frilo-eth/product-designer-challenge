'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'

// ==========================================
// Design Tokens
// ==========================================
const COLORS = {
  wormboneSubtle: 'rgba(245, 235, 229, 0.05)',
}

// ==========================================
// Types
// ==========================================

export interface VaultMetadataCardProps {
  /** Token pair display name e.g. "VSN/USDC" */
  pairName: string
  /** Token 0 symbol for icon lookup */
  token0Symbol: string
  /** Token 1 symbol for icon lookup */
  token1Symbol: string
  /** Token 0 contract address */
  token0Address?: string
  /** Token 1 contract address */
  token1Address?: string
  /** DEX/Exchange name e.g. "uniswap" */
  exchange?: string
  /** Vault version e.g. "V4" */
  vaultVersion?: string
  /** Fee tier percentage e.g. "0.3%" */
  feeTier?: string
  /** Chain ID for network icon */
  chainId: number
  /** Chain name from API e.g. "Ethereum" */
  chainName?: string
  /** Pool contract address (for DEX explorer link) */
  poolAddress?: string
  /** External DEX pool URL (deprecated - use poolAddress instead) */
  poolUrl?: string
  /** 30D Volume in USD */
  volume30d?: number
  /** 30D Fees in USD */
  fees30d?: number
  /** 30D APR percentage */
  apr30d?: number
  /** Loading state */
  loading?: boolean
  /** Error state for volume */
  volumeError?: boolean
  /** Error state for fees */
  feesError?: boolean
  /** Error state for APR */
  aprError?: boolean
}

// ==========================================
// Token Icon Map
// ==========================================

const TOKEN_ICON_MAP: Record<string, string> = {
  VSN: '/assets/icons/tokens/vsn.svg',
  USDC: '/assets/icons/tokens/usdc.svg',
  ETH: '/assets/icons/tokens/eth.svg',
  WETH: '/assets/icons/tokens/weth.svg',
  MORPHO: '/assets/icons/tokens/morpho.svg',
  FOLKS: '/assets/icons/tokens/folks.svg',
  USDT: '/assets/icons/tokens/usdt.svg',
  WOO: '/assets/icons/tokens/woo.svg',
}

const NETWORK_ICON_MAP: Record<number, string> = {
  1: '/assets/icons/networks/eth.svg',
  56: '/assets/icons/networks/bnb.svg',
  8453: '/assets/icons/networks/base.svg',
}

const DEX_ICON_MAP: Record<string, string> = {
  uniswap: '/assets/icons/dex/uniswap.svg',
  univ3: '/assets/icons/dex/uniswap.svg',
  pancakeswap: '/assets/icons/dex/cake.svg',
  cake: '/assets/icons/dex/cake.svg',
  aerodrome: '/assets/icons/dex/aero.svg',
  aero: '/assets/icons/dex/aero.svg',
}

// ==========================================
// Helper Components
// ==========================================

// Helper to get DEX pool URL or block explorer URL
function getPoolUrl(
  exchange: string | undefined,
  chainName: string | undefined,
  chainId: number,
  poolAddress: string
): string {
  const exchangeLower = exchange?.toLowerCase() || ''
  
  // For Uniswap pools, use Uniswap explorer
  if ((exchangeLower.includes('uniswap') || exchangeLower === 'uniswap') && chainName && poolAddress) {
    const chainNameLower = chainName.toLowerCase()
    return `https://app.uniswap.org/explore/pools/${chainNameLower}/${poolAddress}`
  }

  // For PancakeSwap pools, use PancakeSwap liquidity pool URL
  if ((exchangeLower.includes('pancake') || exchangeLower === 'pancakeswap') && poolAddress) {
    return `https://pancakeswap.finance/liquidity/pool/bsc/${poolAddress}`
  }

  // For Aerodrome pools, use Blockscout explorer
  if ((exchangeLower.includes('aerodrome') || exchangeLower === 'aerodrome') && poolAddress) {
    return `https://base.blockscout.com/address/${poolAddress}`
  }

  // For other DEXs or fallback, use block explorer
  const baseUrls: Record<number, string> = {
    1: 'https://etherscan.io/address',
    56: 'https://bscscan.com/address',
    8453: 'https://basescan.org/address',
  }
  const baseUrl = baseUrls[chainId] || `https://etherscan.io/address`
  return `${baseUrl}/${poolAddress}`
}

// Helper to get block explorer URL for a token address
function getTokenExplorerUrl(chainId: number, address: string): string {
  const baseUrls: Record<number, string> = {
    1: 'https://etherscan.io/address',
    56: 'https://bscscan.com/address',
    8453: 'https://basescan.org/address',
  }
  const baseUrl = baseUrls[chainId] || `https://etherscan.io/address`
  return `${baseUrl}/${address}`
}

// Helper to copy address URL to clipboard
async function copyTokenAddressUrl(chainId: number, address: string, tokenSymbol: string) {
  try {
    const url = getTokenExplorerUrl(chainId, address)
    await navigator.clipboard.writeText(url)
    toast.success(`${tokenSymbol} address URL copied`)
  } catch (err) {
    toast.error('Failed to copy address URL')
  }
}

function TokenPairIcons({
  token0Symbol,
  token1Symbol,
  token0Address,
  token1Address,
  chainId,
}: {
  token0Symbol: string
  token1Symbol: string
  token0Address?: string
  token1Address?: string
  chainId: number
}) {
  const token0Icon = TOKEN_ICON_MAP[token0Symbol.toUpperCase()] || TOKEN_ICON_MAP.ETH
  const token1Icon = TOKEN_ICON_MAP[token1Symbol.toUpperCase()] || TOKEN_ICON_MAP.ETH

  return (
    <div className="flex items-center" style={{ marginRight: '4px' }}>
      {token0Address ? (
        <button
          onClick={() => copyTokenAddressUrl(chainId, token0Address, token0Symbol)}
          className="relative rounded-full overflow-hidden cursor-pointer group"
          style={{
            width: 32,
            height: 32,
            border: '1px solid rgba(245, 235, 229, 0.05)',
            zIndex: 2,
          }}
          title={`Click to copy ${token0Symbol} address URL`}
        >
          <Image src={token0Icon} alt={token0Symbol} width={32} height={32} />
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: COLORS.wormboneSubtle }}
          />
        </button>
      ) : (
        <div
          className="relative rounded-full overflow-hidden"
          style={{
            width: 32,
            height: 32,
            border: '1px solid rgba(245, 235, 229, 0.05)',
            zIndex: 2,
          }}
        >
          <Image src={token0Icon} alt={token0Symbol} width={32} height={32} />
        </div>
      )}
      {token1Address ? (
        <button
          onClick={() => copyTokenAddressUrl(chainId, token1Address, token1Symbol)}
          className="relative rounded-full overflow-hidden cursor-pointer group"
          style={{
            width: 32,
            height: 32,
            marginLeft: '-8px',
            border: '1px solid rgba(245, 235, 229, 0.05)',
            zIndex: 1,
          }}
          title={`Click to copy ${token1Symbol} address URL`}
        >
          <Image src={token1Icon} alt={token1Symbol} width={32} height={32} />
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: COLORS.wormboneSubtle }}
          />
        </button>
      ) : (
        <div
          className="relative rounded-full overflow-hidden"
          style={{
            width: 32,
            height: 32,
            marginLeft: '-8px',
            border: '1px solid rgba(245, 235, 229, 0.05)',
            zIndex: 1,
          }}
        >
          <Image src={token1Icon} alt={token1Symbol} width={32} height={32} />
        </div>
      )}
    </div>
  )
}

function VaultBadges({
  exchange,
  vaultVersion,
  feeTier,
  chainId,
  chainName,
  poolAddress,
  poolUrl,
}: {
  exchange?: string
  vaultVersion?: string
  feeTier?: string
  chainId: number
  chainName?: string
  poolAddress?: string
  poolUrl?: string
}) {
  const dexIcon = exchange ? DEX_ICON_MAP[exchange.toLowerCase()] : null
  const networkIcon = NETWORK_ICON_MAP[chainId]

  const content = (
    // Outer container: dex/fee/chain - wraps content
    <div
      style={{
        display: 'inline-flex',
        padding: '2px',
        alignItems: 'center',
        gap: '2px',
        borderRadius: '8px',
        background: 'rgba(245, 235, 229, 0.05)',
        width: 'fit-content',
      }}
    >
      {/* Left side: dex/fee container */}
      <div
        className="flex items-center"
        style={{
          padding: '2px 4px 2px 2px',
          gap: '4px',
          borderRadius: '6px',
          background: 'rgba(245, 235, 229, 0.05)',
        }}
      >
        {/* Uniswap logo container */}
        {dexIcon && (
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              background: '#F5EBE5',
            }}
          >
            <Image
              src={dexIcon}
              alt={exchange || 'DEX'}
              width={12}
              height={14}
              style={{ objectFit: 'contain' }}
            />
          </div>
        )}

        {/* V4 indicator */}
        {vaultVersion && (
          <span
            className="font-mono uppercase"
            style={{
              color: '#8E7571',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '16px',
            }}
          >
            {vaultVersion}
          </span>
        )}

        {/* Vertical divider */}
        {feeTier && (
          <div
            style={{
              width: '1px',
              height: '12px',
              background: 'rgba(245, 235, 229, 0.15)',
            }}
          />
        )}

        {/* Fee tier indicator */}
        {feeTier && (
          <span
            className="font-mono uppercase"
            style={{
              color: '#F5EBE5',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '16px',
            }}
          >
            {feeTier}
          </span>
        )}
      </div>

      {/* Right side: network icon container */}
      {networkIcon && (
        <div
          className="flex items-center"
          style={{
            padding: '2px',
            gap: '4px',
          }}
        >
          <Image
            src={networkIcon}
            alt="Network"
            width={16}
            height={16}
            className="rounded-full"
          />
        </div>
      )}
    </div>
  )

  // Use poolAddress to build DEX explorer URL (Uniswap) or block explorer URL, fallback to poolUrl if provided
  const poolLink = poolAddress 
    ? getPoolUrl(exchange, chainName, chainId, poolAddress)
    : poolUrl

  if (poolLink) {
    return (
      <a
        href={poolLink}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
        aria-label={exchange ? `View ${exchange} pool on block explorer` : 'View pool on block explorer'}
      >
        {content}
      </a>
    )
  }

  return content
}

// Consistent min-height for all metric states to prevent layout jumps
const METRIC_MIN_HEIGHT = 44 // Label (~14px) + gap + value (~24px)

function MetricColumn({
  label,
  value,
  loading,
  error,
}: {
  label: string
  value: string
  loading?: boolean
  error?: boolean
}) {
  // Loading state - same structure as normal for smooth transition
  if (loading) {
    return (
      <div 
        className="flex flex-col gap-0.5 items-start min-w-0"
        style={{ minHeight: METRIC_MIN_HEIGHT }}
      >
        <div className="h-[14px] w-20 sm:w-24 rounded bg-white/10 animate-pulse" />
        <div className="h-[20px] sm:h-[24px] w-28 sm:w-32 rounded bg-white/10 animate-pulse" />
      </div>
    )
  }

  // Error state - maintains same height structure with long hyphen
  if (error) {
    return (
      <div 
        className="flex flex-col gap-0.5 items-start min-w-0"
        style={{ minHeight: METRIC_MIN_HEIGHT }}
      >
        <span
          className="text-[11px] sm:text-[12px] font-normal"
          style={{ color: '#8E7571' }}
        >
          {label}
        </span>
        <span
          className="text-[16px] sm:text-[20px] font-medium tracking-tight"
          style={{ color: '#EC9117' }}
        >
          —
        </span>
      </div>
    )
  }

  // Success state
  return (
    <div 
      className="flex flex-col gap-0.5 items-start min-w-0"
      style={{ minHeight: METRIC_MIN_HEIGHT }}
    >
      <span
        className="text-[11px] sm:text-[12px] font-normal"
        style={{ color: '#8E7571' }}
      >
        {label}
      </span>
      <span
        className="text-[16px] sm:text-[20px] font-medium tracking-tight truncate max-w-full"
        style={{ color: '#EC9117' }}
      >
        {value}
      </span>
    </div>
  )
}

// ==========================================
// Main Component
// ==========================================

export function VaultMetadataCard({
  pairName,
  token0Symbol,
  token1Symbol,
  token0Address,
  token1Address,
  exchange,
  vaultVersion,
  feeTier,
  chainId,
  chainName,
  poolAddress,
  poolUrl,
  volume30d,
  fees30d,
  apr30d,
  loading,
  volumeError,
  feesError,
  aprError,
}: VaultMetadataCardProps) {
  // Format values
  const formattedVolume = useMemo(() => {
    if (volume30d === undefined || volumeError) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(volume30d)
  }, [volume30d, volumeError])

  const formattedFees = useMemo(() => {
    if (fees30d === undefined || feesError) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(fees30d)
  }, [fees30d, feesError])

  const formattedApr = useMemo(() => {
    if (apr30d === undefined || aprError) return '—'
    return `${apr30d.toFixed(2)}%`
  }, [apr30d, aprError])

  return (
    <div
      className="rounded-[16px] border"
      style={{
        background: '#171312',
        borderColor: '#221C1B',
        minHeight: '82px', // Consistent height across loading/error/success states
      }}
    >
      {/* Responsive Grid: Desktop (4 cols) | Mobile (1 col stack) */}
      <div 
        className="grid items-center gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[40%_20%_20%_20%] grid-cols-1"
        style={{
          minHeight: '56px', // Inner content min-height for consistency
        }}
      >
        {/* Left side: Token pair + badges */}
        <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
          <TokenPairIcons 
            token0Symbol={token0Symbol} 
            token1Symbol={token1Symbol}
            token0Address={token0Address}
            token1Address={token1Address}
            chainId={chainId}
          />
          <div className="flex items-center gap-1">
            {token0Address ? (
              <button
                onClick={() => copyTokenAddressUrl(chainId, token0Address, token0Symbol)}
                className="text-[18px] sm:text-[20px] font-medium tracking-tight whitespace-nowrap cursor-pointer relative group rounded px-1 -mx-1"
                style={{ color: '#F5EBE5' }}
                title={`Click to copy ${token0Symbol} address URL`}
              >
                {token0Symbol}
                <div
                  className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: COLORS.wormboneSubtle }}
                />
              </button>
            ) : (
              <span 
                className="text-[18px] sm:text-[20px] font-medium tracking-tight whitespace-nowrap" 
                style={{ color: '#F5EBE5' }}
              >
                {token0Symbol}
              </span>
            )}
            <span 
              className="text-[18px] sm:text-[20px] font-medium tracking-tight" 
              style={{ color: '#8E7571' }}
            >
              /
            </span>
            {token1Address ? (
              <button
                onClick={() => copyTokenAddressUrl(chainId, token1Address, token1Symbol)}
                className="text-[18px] sm:text-[20px] font-medium tracking-tight whitespace-nowrap cursor-pointer relative group rounded px-1 -mx-1"
                style={{ color: '#F5EBE5' }}
                title={`Click to copy ${token1Symbol} address URL`}
              >
                {token1Symbol}
                <div
                  className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: COLORS.wormboneSubtle }}
                />
              </button>
            ) : (
              <span 
                className="text-[18px] sm:text-[20px] font-medium tracking-tight whitespace-nowrap" 
                style={{ color: '#F5EBE5' }}
              >
                {token1Symbol}
              </span>
            )}
          </div>
          <VaultBadges
            exchange={exchange}
            vaultVersion={vaultVersion}
            feeTier={feeTier}
            chainId={chainId}
            chainName={chainName}
            poolAddress={poolAddress}
            poolUrl={poolUrl}
          />
        </div>

        {/* Stats - Responsive: Desktop (centered) | Mobile (left-aligned) */}
        <div className="flex justify-start lg:justify-center">
          <MetricColumn
            label="30D Volume"
            value={formattedVolume}
            loading={loading}
            error={volumeError}
          />
        </div>
        <div className="flex justify-start lg:justify-center">
          <MetricColumn
            label="30D Fees"
            value={formattedFees}
            loading={loading}
            error={feesError}
          />
        </div>
        <div className="flex justify-start lg:justify-center">
          <MetricColumn
            label="30D APR"
            value={formattedApr}
            loading={loading}
            error={aprError}
          />
        </div>
      </div>
    </div>
  )
}
