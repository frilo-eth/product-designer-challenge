'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

export interface VaultItem {
  key: string
  displayName: string
  chainId: number
  address: string
  token0Symbol: string  // e.g., 'VSN', 'MORPHO', 'FOLKS', 'WOO'
  token1Symbol: string  // e.g., 'USDC', 'ETH', 'USDT', 'WETH'
}

export interface Account {
  id: string
  name: string
  displayName: string
  address: string
  fullAddress: string  // Full address for blockie generation
  vaults: VaultItem[]
}

interface AppSidebarProps {
  accounts: Account[]
  selectedAccountId: string
  selectedVaultKey: string | null
  onAccountChange: (accountId: string) => void
  onVaultSelect: (vaultKey: string) => void
  collapsed?: boolean
  className?: string
}

// ============================================
// Token Symbol to Icon Path Mapping
// ============================================

const TOKEN_ICONS: Record<string, string> = {
  VSN: '/assets/icons/tokens/vsn.svg',
  USDC: '/assets/icons/tokens/usdc.svg',
  ETH: '/assets/icons/tokens/eth.svg',
  WETH: '/assets/icons/tokens/eth.svg',
  MORPHO: '/assets/icons/tokens/morpho.svg',
  FOLKS: '/assets/icons/tokens/folks.svg',
  USDT: '/assets/icons/tokens/usdt.svg',
  WOO: '/assets/icons/tokens/woo.svg',
}

// ============================================
// Ethereum Blockie Generator
// ============================================

// Simple deterministic PRNG based on seed
function createPRNG(seed: string) {
  let s = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// Generate blockie colors from address
function generateBlockieColors(address: string): { primary: string; secondary: string; background: string } {
  const rand = createPRNG(address.toLowerCase())
  
  const hue1 = Math.floor(rand() * 360)
  const hue2 = (hue1 + 180 + Math.floor(rand() * 60) - 30) % 360
  const hue3 = Math.floor(rand() * 360)
  
  return {
    primary: `hsl(${hue1}, 70%, 50%)`,
    secondary: `hsl(${hue2}, 60%, 45%)`,
    background: `hsl(${hue3}, 25%, 25%)`,
  }
}

// Generate 8x8 blockie pattern (symmetric)
function generateBlockiePattern(address: string): boolean[][] {
  const rand = createPRNG(address.toLowerCase())
  const pattern: boolean[][] = []
  
  for (let y = 0; y < 8; y++) {
    const row: boolean[] = []
    for (let x = 0; x < 4; x++) {
      row.push(rand() > 0.5)
    }
    // Mirror for symmetry
    pattern.push([...row, ...row.reverse()])
  }
  
  return pattern
}

// Blockie Avatar Component
function BlockieAvatar({ 
  address, 
  size = 32,
  className 
}: { 
  address: string
  size?: number
  className?: string 
}) {
  const { pattern, colors } = useMemo(() => ({
    pattern: generateBlockiePattern(address),
    colors: generateBlockieColors(address),
  }), [address])
  
  const pixelSize = size / 8
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('rounded-[10px] overflow-hidden', className)}
    >
      <rect width={size} height={size} fill={colors.background} />
      {pattern.map((row, y) =>
        row.map((filled, x) => {
          if (!filled) return null
          const isSecondary = (x + y) % 3 === 0
          return (
            <rect
              key={`${x}-${y}`}
              x={x * pixelSize}
              y={y * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill={isSecondary ? colors.secondary : colors.primary}
            />
          )
        })
      )}
    </svg>
  )
}

// ============================================
// Token Icon Component
// ============================================

function TokenIcon({ 
  symbol, 
  size = 16,
  className 
}: { 
  symbol: string
  size?: number
  className?: string 
}) {
  const iconPath = TOKEN_ICONS[symbol.toUpperCase()]
  
  if (iconPath) {
    return (
      <Image
        src={iconPath}
        alt={symbol}
        width={size}
        height={size}
        className={cn('rounded-full', className)}
      />
    )
  }
  
  // Fallback for unknown tokens
  return (
    <div
      className={cn(
        'rounded-full bg-[#8E7571] flex items-center justify-center text-[8px] font-medium text-[#171312]',
        className
      )}
      style={{ width: size, height: size }}
    >
      {symbol.slice(0, 2)}
    </div>
  )
}

// ============================================
// Token Pair Component
// ============================================

function TokenPair({
  token0Symbol,
  token1Symbol,
  size = 16,
}: {
  token0Symbol: string
  token1Symbol: string
  size?: number
}) {
  return (
    <div className="flex items-center" style={{ gap: '-4px' }}>
      <TokenIcon symbol={token0Symbol} size={size} className="z-10 -mr-1" />
      <TokenIcon symbol={token1Symbol} size={size} />
    </div>
  )
}

// ============================================
// Vault List Item Component
// ============================================

function VaultListItem({
  vault,
  isSelected,
  onClick,
}: {
  vault: VaultItem
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 h-8 px-2 rounded-lg transition-colors',
        'hover:bg-[rgba(245,235,229,0.05)]',
        isSelected && 'bg-[rgba(245,235,229,0.05)]'
      )}
    >
      <TokenPair token0Symbol={vault.token0Symbol} token1Symbol={vault.token1Symbol} />
      <span className="text-sm text-[#F5EBE5] truncate">{vault.displayName}</span>
    </button>
  )
}

// ============================================
// Account Switcher Component
// ============================================

function AccountSwitcher({
  accounts,
  selectedAccountId,
  onAccountChange,
}: {
  accounts: Account[]
  selectedAccountId: string
  onAccountChange: (accountId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  if (!selectedAccount) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 h-12 px-2 rounded-lg transition-colors',
          'hover:bg-[rgba(245,235,229,0.05)]'
        )}
      >
        {/* Blockie Avatar */}
        <BlockieAvatar address={selectedAccount.fullAddress} size={32} />

        {/* Account Info */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-[#F5EBE5] truncate">
            {selectedAccount.displayName}
          </p>
          <p className="text-xs text-[#8E7571] truncate">{selectedAccount.address}</p>
        </div>

        {/* Chevron Icon */}
        <ChevronUp
          className={cn(
            'size-4 text-[#F5EBE5] transition-transform shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-[#171312] border border-[#221C1B] rounded-lg overflow-hidden shadow-xl">
            {/* Account Options */}
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  onAccountChange(account.id)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-2 h-12 px-2 transition-colors',
                  'hover:bg-[rgba(245,235,229,0.05)]',
                  account.id === selectedAccountId && 'bg-[rgba(245,235,229,0.05)]'
                )}
              >
                {/* Blockie Avatar */}
                <BlockieAvatar address={account.fullAddress} size={32} />

                {/* Account Info */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-[#F5EBE5] truncate">
                    {account.displayName}
                  </p>
                  <p className="text-xs text-[#8E7571] truncate">{account.address}</p>
                </div>

                {/* Vault count badge */}
                <span className="text-[10px] text-[#8E7571] bg-[rgba(245,235,229,0.05)] px-1.5 py-0.5 rounded">
                  {account.vaults.length} vault{account.vaults.length !== 1 ? 's' : ''}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// Main Sidebar Component
// ============================================

export function AppSidebar({
  accounts,
  selectedAccountId,
  selectedVaultKey,
  onAccountChange,
  onVaultSelect,
  collapsed = false,
  className,
}: AppSidebarProps) {
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)
  const vaults = selectedAccount?.vaults || []

  return (
    <aside
      className={cn(
        'h-full bg-[#171312] border-r border-[#221C1B] flex flex-col transition-all duration-200',
        collapsed ? 'w-0 overflow-hidden border-none' : 'w-64',
        className
      )}
    >
      {/* Logo Header - 56px height to match navbar */}
      <div className="min-h-[56px] px-2 flex items-center border-b border-[#221C1B]">
        <div className="h-8 px-1.5 flex items-center rounded-lg w-full">
          <Image
            src="/assets/icons/logo.svg"
            alt="Arrakis"
            width={107}
            height={20}
            className="h-5 w-auto"
          />
        </div>
      </div>

      {/* Vault List */}
      <div className="flex-1 overflow-auto p-2">
        <div className="flex flex-col">
          {/* Section Header */}
          <div className="h-8 px-2 flex items-center">
            <span className="text-xs font-medium text-[#8E7571]">Vaults</span>
          </div>

          {/* Vault Items */}
          <div className="flex flex-col gap-1">
            {vaults.map((vault) => (
              <VaultListItem
                key={vault.key}
                vault={vault}
                isSelected={vault.key === selectedVaultKey}
                onClick={() => onVaultSelect(vault.key)}
              />
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-[120px]" />
      </div>

      {/* Account Switcher */}
      <div className="p-2">
        <AccountSwitcher
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onAccountChange={onAccountChange}
        />
      </div>
    </aside>
  )
}

export default AppSidebar
