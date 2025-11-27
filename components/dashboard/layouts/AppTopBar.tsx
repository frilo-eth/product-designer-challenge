'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Blockie Generator (same as AppSidebar)
// ============================================
function createPRNG(seed: string) {
  let s = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

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

function generateBlockiePattern(address: string): boolean[][] {
  const rand = createPRNG(address.toLowerCase())
  const pattern: boolean[][] = []
  for (let y = 0; y < 8; y++) {
    const row: boolean[] = []
    for (let x = 0; x < 4; x++) {
      row.push(rand() > 0.5)
    }
    pattern.push([...row, ...row.reverse()])
  }
  return pattern
}

function BlockieAvatar({ address, size = 20 }: { address: string; size?: number }) {
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
      className="rounded-[4px] overflow-hidden flex-shrink-0"
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
// Types
// ============================================
interface VaultOption {
  key: string
  displayName: string
  token0Symbol: string
  token1Symbol: string
}

interface AppTopBarProps {
  vaults: VaultOption[]
  selectedVaultKey: string
  onVaultChange: (vaultKey: string) => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  walletAddress?: string // If connected, show shortened address
  onConnectWallet?: () => void
  onDisconnect?: () => void
}

// ============================================
// Icons
// ============================================
const ArrakisIcon = () => (
  <svg
    width="21"
    height="20"
    viewBox="0 0 21 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.0802 0C4.51255 0 0 4.47663 0 10C0 15.5234 4.51255 20 10.0802 20C15.6479 20 20.1605 15.5234 20.1605 10C20.1605 4.47663 15.6466 0 10.0802 0ZM16.8122 12.3895C16.7564 12.4449 16.7614 12.4399 16.7043 12.4965L12.1867 9.98615L3.34315 16.7918L3.23141 16.6809L10.0917 7.9078L7.56112 3.42612C7.61699 3.3707 7.61191 3.37574 7.66905 3.31906L12.1867 5.82945L16.816 3.20821L16.924 3.31528L14.2817 7.9078L16.8122 12.3895Z"
      fill="#F5EBE5"
    />
  </svg>
)

const CollapseSidebarIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 22 22"
    fill="none"
  >
    {/* Chevron - mirrors horizontally when collapsed */}
    <path
      d="M14.2087 8.70801L11.917 10.9997L14.2087 13.2913"
      stroke="#8E7571"
      strokeLinecap="square"
      style={{
        transform: collapsed ? 'scaleX(-1)' : 'none',
        transformOrigin: '13px 11px', // Center of the chevron
        transition: 'transform 150ms ease',
      }}
    />
    {/* Box outline */}
    <path d="M3.20801 3.20801H18.7913V18.7913H3.20801V3.20801Z" stroke="#8E7571" />
    {/* Vertical divider line */}
    <path d="M7.79199 3.20801V18.7913" stroke="#8E7571" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M6 12L10 8L6 4"
      stroke="#392F2D"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// ============================================
// Helpers
// ============================================
const shortenAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// ============================================
// Wallet Button Component
// ============================================
function WalletButton({
  walletAddress,
  onConnectWallet,
  onDisconnect,
}: {
  walletAddress?: string
  onConnectWallet?: () => void
  onDisconnect?: () => void
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const isConnected = !!walletAddress

  // Base button styles shared between states
  const buttonBaseStyles = "h-9 px-3 text-[14px] font-medium leading-5 rounded-lg transition-all flex items-center gap-2"

  // If not connected, show orange CTA button
  if (!isConnected) {
    return (
      <button
        onClick={onConnectWallet}
        className={cn(buttonBaseStyles, "shadow-sm hover:opacity-90")}
        style={{
          background: '#EC9117',
          color: '#171312',
        }}
      >
        Connect wallet
      </button>
    )
  }

  // If connected, show understated button with blockie
  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          buttonBaseStyles,
          "border hover:bg-[#171312]",
          dropdownOpen && "bg-[#171312]"
        )}
        style={{
          borderColor: '#221C1B',
        }}
      >
        <BlockieAvatar address={walletAddress} size={20} />
        <span style={{ color: '#F5EBE5' }}>
          {shortenAddress(walletAddress)}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            dropdownOpen && 'rotate-180'
          )}
          style={{ color: '#8E7571' }}
        />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full right-0 mt-1 z-50 min-w-[180px] bg-[#171312] border border-[#221C1B] rounded-lg overflow-hidden shadow-xl py-1">
            {/* Disconnect button */}
            <button
              onClick={() => {
                setDropdownOpen(false)
                onDisconnect?.()
              }}
              className="w-full px-3 py-2 text-left text-[14px] text-[#8E7571] hover:text-[#F5EBE5] hover:bg-[rgba(245,235,229,0.05)] transition-colors flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Disconnect wallet
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// Component
// ============================================
export function AppTopBar({
  vaults,
  selectedVaultKey,
  onVaultChange,
  sidebarCollapsed,
  onToggleSidebar,
  walletAddress,
  onConnectWallet,
  onDisconnect,
}: AppTopBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const hasVaultDropdown = vaults.length > 1
  const selectedVault = vaults.find((v) => v.key === selectedVaultKey)

  useEffect(() => {
    if (!hasVaultDropdown && dropdownOpen) {
      setDropdownOpen(false)
    }
  }, [hasVaultDropdown, dropdownOpen])

  return (
    <header
      className="flex min-h-[56px] items-center self-stretch border-b"
      style={{ borderColor: '#221C1B' }}
    >
      {/* Main container */}
      <div className="flex flex-1 items-center gap-2 px-4">
        {/* Arrakis icon (visible when sidebar collapsed) */}
        {sidebarCollapsed && (
          <div className="flex-shrink-0 mr-1">
            <ArrakisIcon />
          </div>
        )}

        {/* Collapse sidebar button */}
        <button
          onClick={onToggleSidebar}
          className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center hover:opacity-80 transition-opacity"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <CollapseSidebarIcon collapsed={sidebarCollapsed} />
        </button>

        {/* Vertical divider */}
        <div
          className="h-4 w-px flex-shrink-0"
          style={{ background: '#221C1B' }}
        />

        {/* Breadcrumbs */}
        <nav className="flex flex-wrap items-center content-center gap-x-[10px]">
          {/* Root: Vaults */}
          <span
            className="text-[14px] font-medium leading-5"
            style={{ color: '#8E7571' }}
          >
            Vaults
          </span>

          {/* Chevron separator */}
          <ChevronRightIcon />

          {/* Active vault with optional dropdown */}
          <div className="relative">
            {hasVaultDropdown ? (
              <>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <span
                    className="text-[14px] font-normal leading-5"
                    style={{ color: '#F5EBE5' }}
                  >
                    {selectedVault?.displayName || 'Select vault'}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      dropdownOpen && 'rotate-180'
                    )}
                    style={{ color: '#8E7571' }}
                  />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] bg-[#171312] border border-[#221C1B] rounded-lg overflow-hidden shadow-xl py-1">
                      {vaults.map((vault) => (
                        <button
                          key={vault.key}
                          onClick={() => {
                            onVaultChange(vault.key)
                            setDropdownOpen(false)
                          }}
                          className={cn(
                            'w-full px-3 py-2 text-left text-[14px] transition-colors',
                            vault.key === selectedVaultKey
                              ? 'text-[#F5EBE5] bg-[rgba(245,235,229,0.05)]'
                              : 'text-[#8E7571] hover:text-[#F5EBE5] hover:bg-[rgba(245,235,229,0.05)]'
                          )}
                        >
                          {vault.displayName}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <span
                className="text-[14px] font-normal leading-5"
                style={{ color: '#F5EBE5' }}
              >
                {selectedVault?.displayName || 'Select vault'}
              </span>
            )}
          </div>
        </nav>
      </div>

      {/* Right side: Wallet button */}
      <div className="px-4">
        <WalletButton
          walletAddress={walletAddress}
          onConnectWallet={onConnectWallet}
          onDisconnect={onDisconnect}
        />
      </div>
    </header>
  )
}
