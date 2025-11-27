'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react'
import { toast } from 'sonner'

import { PriceImpactCard, FeesHistoryCard, InventoryRatioCard, DistributionChartCard, VaultSupportInfoCard, AppSidebar, AppTopBar, VaultMetadataCard } from '@/components/dashboard'
import type { Account, VaultItem } from '@/components/dashboard'
import { fetchVaultDetails, fetchFeesHistory, fetchVaultBalance, fetchLiveInventory, fetchLiquidityProfile, TEST_VAULTS } from '@/lib/api'
import { transformLiquidityProfile, type LiquidityProfileResult } from '@/lib/transformLiquidityProfile'
import { calculateAPR } from '@/lib/calculateAPR'
import { usePriceImpactChartData, useFeesChartData, useInventoryRatioChartData, type Timeframe } from '@/lib/hooks/useChartData'
import { vaultDataCache } from '@/lib/hooks/useLoadingCoordinator'
import type { VaultMetadata, FeesHistoryResponse, VaultBalanceResponse, LiveInventoryResponse } from '@/lib/types'

// ============================================
// Helper Functions
// ============================================
/**
 * Format price with appropriate precision
 * For very small values (< 0.0001), show more digits to avoid showing 0.0000
 */
function formatPrice(value: number): string {
  if (value >= 1) {
    const fixed = value.toFixed(4)
    const [intPart, decPart] = fixed.split('.')
    const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return decPart ? `${intWithCommas}.${decPart}` : intWithCommas
  } else if (value >= 0.0001) {
    return value.toFixed(4)
  } else if (value >= 0.00001) {
    return value.toFixed(6)
  } else if (value >= 0.000001) {
    return value.toFixed(8)
  } else {
    // For extremely small values, use scientific notation or more precision
    return value.toFixed(10).replace(/\.?0+$/, '')
  }
}

// Chain ID to network name mapping
const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  56: 'BSC',
  8453: 'Base',
}

// Vault configuration with display names, tolerances, and token info
interface VaultConfig {
  name: string
  tolerance: number
  token0Symbol: string
  token1Symbol: string
  token0Color: string
  token1Color: string
  account: string
  exchange?: string
  vaultVersion?: string
  feeTier?: string
  poolUrl?: string
  /** Invert the price value (show 1/ratio instead of ratio) */
  invertValue?: boolean
  /** Show "token0 per token1" label instead of "token1 per token0" */
  showToken0PerToken1?: boolean
}

const VAULT_CONFIGS: Record<string, VaultConfig> = {
  // Vault 1: VSN/USDC - Ethereum (Vision)
  // API returns 0.077 = USDC per VSN (token1/token0) - show as-is
  '1-0xe20b37048bec200db1ef35669a4c8a9470ce3288': {
    name: 'VSN/USDC',
    tolerance: 2,
    token0Symbol: 'VSN',
    token1Symbol: 'USDC',
    token0Color: '#103E36',
    token1Color: '#2775CA',
    account: 'vision',
    exchange: 'uniswap',
    vaultVersion: 'V4',
    feeTier: '0.75%',
    poolUrl: 'https://app.arrakis.finance/vault/1/0xe20b37048bec200db1ef35669a4c8a9470ce3288',
    // invertValue: false, showToken0PerToken1: false → "0.077 USDC per VSN"
  },
  // Vault 2: VSN/ETH - Ethereum (Vision)
  // API returns ETH per VSN (token1/token0) - need to invert for "VSN per ETH"
  '1-0x70a8be67675837db9b0c7c36cb629c8aab479e93': {
    name: 'VSN/ETH',
    tolerance: 1.5,
    token0Symbol: 'VSN',
    token1Symbol: 'ETH',
    token0Color: '#103E36',
    token1Color: '#627EEA',
    account: 'vision',
    exchange: 'uniswap',
    vaultVersion: 'V4',
    feeTier: '0.75%',
    poolUrl: 'https://app.arrakis.finance/vault/1/0x70a8be67675837db9b0c7c36cb629c8aab479e93',
    invertValue: true,          // Invert ratio
    showToken0PerToken1: true,  // Show "VSN per ETH"
  },
  // Vault 3: MORPHO/ETH - Ethereum (Morpho)
  // API returns ETH per MORPHO - need to invert for "MORPHO per ETH"
  '1-0x9f71298ee14176395c36797e65be1169e15f20d4': {
    name: 'MORPHO/ETH',
    tolerance: 3,
    token0Symbol: 'MORPHO',
    token1Symbol: 'ETH',
    token0Color: '#2470FF',
    token1Color: '#F5EBE5',
    account: 'morpho',
    exchange: 'uniswap',
    vaultVersion: 'V4',
    feeTier: '0.29%',
    poolUrl: 'https://app.arrakis.finance/vault/1/0x9f71298ee14176395c36797e65be1169e15f20d4',
    invertValue: true,          // Invert to show "MORPHO per ETH"
    showToken0PerToken1: true,  // Show "MORPHO per ETH"
  },
  // Vault 4: FOLKS/USDT - BSC (Folks) - PancakeSwap
  // API returns FOLKS per USDT - need to invert for "USDT per FOLKS"
  '56-0xb7f3c2dd386bb750d3e2132a1579d496c5faaf24': {
    name: 'FOLKS/USDT',
    tolerance: 2,
    token0Symbol: 'FOLKS',
    token1Symbol: 'USDT',
    token0Color: '#2F5CA6',
    token1Color: '#50AF95',
    account: 'folks',
    exchange: 'pancakeswap',
    vaultVersion: 'V3',
    feeTier: '0.0067%',
    poolUrl: 'https://app.arrakis.finance/vault/56/0xb7f3c2dd386bb750d3e2132a1579d496c5faaf24',
    invertValue: true,  // Invert to show "USDT per FOLKS"
  },
  // Vault 5: WOO/WETH - Base (Woo) - Aerodrome
  // API token0=WETH, token1=WOO, returns WOO per WETH - show as-is
  '8453-0x5666af5c1b8d4bfe717a0d065fdc0bb190d49e42': {
    name: 'WOO/WETH',
    tolerance: 2,
    token0Symbol: 'WETH',
    token1Symbol: 'WOO',
    token0Color: '#627EEA',
    token1Color: '#20252F',
    account: 'woo',
    exchange: 'aerodrome',
    vaultVersion: 'V3',
    feeTier: '0.3%',
    poolUrl: 'https://app.arrakis.finance/vault/8453/0x5666af5c1b8d4bfe717a0d065fdc0bb190d49e42',
    invertValue: false,          // Don't invert - value already correct
    showToken0PerToken1: false,  // Show "WOO per WETH" (token1 per token0)
  },
}

// Build vault items from TEST_VAULTS
const ALL_VAULTS: VaultItem[] = TEST_VAULTS.map((vault) => {
  const key = `${vault.chainId}-${vault.address}`
  const config = VAULT_CONFIGS[key]
  return {
    key,
    displayName: config?.name || 'Unknown Vault',
    chainId: vault.chainId,
    address: vault.address,
    token0Symbol: config?.token0Symbol || 'TKN0',
    token1Symbol: config?.token1Symbol || 'TKN1',
  }
})

// Account configurations with unique addresses for blockie generation
const ACCOUNTS: Account[] = [
  {
    id: 'vision',
    name: 'Vision',
    displayName: 'vision.eth',
    address: '0xF6...0031',
    fullAddress: '0xF61e6E7B96D4Aef261b52eaec8AcD4bbd6ea0031',
    vaults: ALL_VAULTS.filter((v) => {
      const config = VAULT_CONFIGS[v.key]
      return config?.account === 'vision'
    }),
  },
  {
    id: 'morpho',
    name: 'Morpho',
    displayName: 'morpho.eth',
    address: '0x9F...1E34',
    fullAddress: '0x9F71298EE14176395c36797E65bE1169E15F1E34',
    vaults: ALL_VAULTS.filter((v) => {
      const config = VAULT_CONFIGS[v.key]
      return config?.account === 'morpho'
    }),
  },
  {
    id: 'folks',
    name: 'Folks',
    displayName: 'folks.eth',
    address: '0xB7...F24',
    fullAddress: '0xB7F3C2DD386BB750D3E2132a1579D496c5FaAF24',
    vaults: ALL_VAULTS.filter((v) => {
      const config = VAULT_CONFIGS[v.key]
      return config?.account === 'folks'
    }),
  },
  {
    id: 'woo',
    name: 'WOO',
    displayName: 'woo.eth',
    address: '0x56...E42',
    fullAddress: '0x5666AF5C1B8D4BFE717A0D065FDC0BB190D49E42',
    vaults: ALL_VAULTS.filter((v) => {
      const config = VAULT_CONFIGS[v.key]
      return config?.account === 'woo'
    }),
  },
]

// Helper to get vault config
function getVaultConfig(key: string) {
  const config = VAULT_CONFIGS[key]
  const vault = ALL_VAULTS.find((v) => v.key === key)
  return {
    ...vault,
    tolerance: config?.tolerance || 2,
    token0Color: config?.token0Color || '#103E36',
    token1Color: config?.token1Color || '#2775CA',
    chainName: vault ? CHAIN_NAMES[vault.chainId] || `Chain ${vault.chainId}` : 'Unknown',
    exchange: config?.exchange,
    vaultVersion: config?.vaultVersion,
    feeTier: config?.feeTier,
    poolUrl: config?.poolUrl,
    invertValue: config?.invertValue,
    showToken0PerToken1: config?.showToken0PerToken1,
  }
}


export default function Home() {
  const [selectedAccountId, setSelectedAccountId] = useState(ACCOUNTS[0].id)
  const [selectedVaultKey, setSelectedVaultKey] = useState<string | null>(ACCOUNTS[0].vaults[0]?.key || null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [vaultDetails, setVaultDetails] = useState<VaultMetadata | null>(null)
  const [priceImpactStatus, setPriceImpactStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [priceImpactError, setPriceImpactError] = useState<string | null>(null)

  // Fees history state
  const [feesHistory, setFeesHistory] = useState<FeesHistoryResponse | null>(null)
  const [feesStatus, setFeesStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')

  // Inventory ratio state
  const [inventoryHistory, setInventoryHistory] = useState<VaultBalanceResponse | null>(null)
  const [inventoryStatus, setInventoryStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [inventoryTimeframe, setInventoryTimeframe] = useState<Timeframe>('1M')

  // Live inventory state (for TVL)
  const [liveInventory, setLiveInventory] = useState<LiveInventoryResponse | null>(null)

  // Liquidity profile state (for distribution chart)
  const [liquidityProfile, setLiquidityProfile] = useState<LiquidityProfileResult | null>(null)
  const [liquidityStatus, setLiquidityStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Track previous vault for prefetching
  const previousVaultRef = useRef<string | null>(null)

  // Get current account's vaults for the top bar
  const currentAccountVaults = useMemo(() => {
    const account = ACCOUNTS.find((a) => a.id === selectedAccountId)
    return account?.vaults || []
  }, [selectedAccountId])

  // Get current account's full address for the wallet button
  const currentAccountAddress = useMemo(() => {
    const account = ACCOUNTS.find((a) => a.id === selectedAccountId)
    return account?.fullAddress
  }, [selectedAccountId])

  const selectedVault = useMemo(() => {
    if (!selectedVaultKey) return null
    return getVaultConfig(selectedVaultKey)
  }, [selectedVaultKey])

  // Handle account change
  const handleAccountChange = useCallback((accountId: string) => {
    setSelectedAccountId(accountId)
    const account = ACCOUNTS.find((a) => a.id === accountId)
    if (account && account.vaults.length > 0) {
      setSelectedVaultKey(account.vaults[0].key)
    } else {
      setSelectedVaultKey(null)
    }
  }, [])

  // Handle disconnect - placeholder for wallet disconnection
  const handleDisconnect = useCallback(() => {
    // In a real app, this would disconnect the wallet via RainbowKit/wagmi
  }, [])

  const loadPriceImpact = useCallback(
    async (
      chainId: number,
      address: string,
      tracker?: { cancelled: boolean }
    ) => {
      setPriceImpactStatus('loading')
      setPriceImpactError(null)
      setVaultDetails(null)

      try {
        const details = await vaultDataCache.fetchWithCache(
          chainId, address, 'vaultDetails',
          () => fetchVaultDetails(chainId, address)
        )
        if (tracker?.cancelled) return

        setVaultDetails(details)
        setPriceImpactStatus('success')
      } catch (error) {
        if (tracker?.cancelled) return
        setPriceImpactStatus('error')
        setPriceImpactError(
          error instanceof Error ? error.message : 'Failed to fetch price impact'
        )
      }
    },
    []
  )

  const loadFeesHistory = useCallback(
    async (
      chainId: number,
      address: string,
      tracker?: { cancelled: boolean }
    ) => {
      setFeesStatus('loading')
      setFeesHistory(null)

      try {
        const response = await vaultDataCache.fetchWithCache(
          chainId, address, 'feesHistory',
          () => fetchFeesHistory(chainId, address)
        )
        if (tracker?.cancelled) return

        setFeesHistory(response)
        setFeesStatus('success')
      } catch (error) {
        if (tracker?.cancelled) return
        setFeesStatus('error')
      }
    },
    []
  )

  const loadInventoryHistory = useCallback(
    async (
      chainId: number,
      address: string,
      tracker?: { cancelled: boolean }
    ) => {
      setInventoryStatus('loading')
      setInventoryHistory(null)

      try {
        const response = await vaultDataCache.fetchWithCache(
          chainId, address, 'inventoryHistory',
          () => fetchVaultBalance(chainId, address)
        )
        if (tracker?.cancelled) return

        setInventoryHistory(response)
        setInventoryStatus('success')
      } catch (error) {
        if (tracker?.cancelled) return
        setInventoryStatus('error')
      }
    },
    []
  )

  const loadLiveInventory = useCallback(
    async (
      chainId: number,
      address: string,
      tracker?: { cancelled: boolean }
    ) => {
      setLiveInventory(null)

      try {
        const response = await vaultDataCache.fetchWithCache(
          chainId, address, 'liveInventory',
          () => fetchLiveInventory(chainId, address)
        )
        if (tracker?.cancelled) return

        setLiveInventory(response)
      } catch (error) {
        if (tracker?.cancelled) return
        // Silently fail for live inventory
      }
    },
    []
  )

  const loadLiquidityProfile = useCallback(
    async (
      chainId: number,
      address: string,
      tvlUSD?: number,
      tracker?: { cancelled: boolean }
    ) => {
      setLiquidityStatus('loading')
      setLiquidityProfile(null)

      try {
        const response = await vaultDataCache.fetchWithCache(
          chainId, address, 'liquidityProfile',
          () => fetchLiquidityProfile(chainId, address)
        )
        if (tracker?.cancelled) return

        // Transform the raw data into chart-ready format
        const transformed = transformLiquidityProfile(response, undefined, tvlUSD)
        if (tracker?.cancelled) return

        setLiquidityProfile(transformed)
        setLiquidityStatus(transformed ? 'success' : 'error')
      } catch (error) {
        if (tracker?.cancelled) return
        setLiquidityStatus('error')
      }
    },
    []
  )

  // Prefetch adjacent vaults for snappier navigation
  const prefetchAdjacentVaults = useCallback(() => {
    const currentAccount = ACCOUNTS.find(a => a.id === selectedAccountId)
    if (!currentAccount) return

    const currentIndex = currentAccount.vaults.findIndex(v => v.key === selectedVaultKey)
    const adjacentVaults = [
      currentAccount.vaults[currentIndex - 1],
      currentAccount.vaults[currentIndex + 1],
    ].filter(Boolean)

    adjacentVaults.forEach(vault => {
      const config = VAULT_CONFIGS[vault.key]
      if (!config) return
      
      const [chainIdStr] = vault.key.split('-')
      const chainId = parseInt(chainIdStr, 10)
      
      // Prefetch all data types in background
      vaultDataCache.prefetch(chainId, vault.address, 'vaultDetails', () => fetchVaultDetails(chainId, vault.address))
      vaultDataCache.prefetch(chainId, vault.address, 'feesHistory', () => fetchFeesHistory(chainId, vault.address))
      vaultDataCache.prefetch(chainId, vault.address, 'inventoryHistory', () => fetchVaultBalance(chainId, vault.address))
      vaultDataCache.prefetch(chainId, vault.address, 'liveInventory', () => fetchLiveInventory(chainId, vault.address))
      vaultDataCache.prefetch(chainId, vault.address, 'liquidityProfile', () => fetchLiquidityProfile(chainId, vault.address))
    })
  }, [selectedAccountId, selectedVaultKey])

  useEffect(() => {
    if (!selectedVault || !selectedVault.chainId || !selectedVault.address) return

    // Track vault changes for prefetching optimization
    previousVaultRef.current = selectedVaultKey

    const tracker = { cancelled: false }
    loadPriceImpact(selectedVault.chainId, selectedVault.address, tracker)
    loadFeesHistory(selectedVault.chainId, selectedVault.address, tracker)
    loadInventoryHistory(selectedVault.chainId, selectedVault.address, tracker)
    loadLiveInventory(selectedVault.chainId, selectedVault.address, tracker)
    
    // Prefetch adjacent vaults after current loads start
    const prefetchTimeout = setTimeout(prefetchAdjacentVaults, 100)
    
    return () => {
      tracker.cancelled = true
      clearTimeout(prefetchTimeout)
    }
  }, [loadPriceImpact, loadFeesHistory, loadInventoryHistory, loadLiveInventory, selectedVault, selectedVaultKey, prefetchAdjacentVaults])

  // Load liquidity profile after we have TVL data
  useEffect(() => {
    if (!selectedVault || !selectedVault.chainId || !selectedVault.address) return
    
    const tracker = { cancelled: false }
    const tvl = liveInventory?.data?.totalValueUSD
    loadLiquidityProfile(selectedVault.chainId, selectedVault.address, tvl, tracker)
    return () => {
      tracker.cancelled = true
    }
  }, [loadLiquidityProfile, selectedVault, liveInventory?.data?.totalValueUSD])

  // Calculate price from inventory amounts if available (more accurate than API price)
  const effectiveCurrentPrice = useMemo(() => {
    if (liveInventory?.data?.tokens?.token0?.amount && 
        liveInventory?.data?.tokens?.token1?.amount &&
        liveInventory?.data?.tokens?.token0?.decimals !== undefined &&
        liveInventory?.data?.tokens?.token1?.decimals !== undefined) {
      const amount0 = parseFloat(liveInventory.data.tokens.token0.amount) / Math.pow(10, liveInventory.data.tokens.token0.decimals)
      const amount1 = parseFloat(liveInventory.data.tokens.token1.amount) / Math.pow(10, liveInventory.data.tokens.token1.decimals)
      if (amount0 > 0 && amount1 > 0) {
        // Calculate price: token1 per token0 (standard format)
        return amount1 / amount0
      }
    }
    return liquidityProfile?.currentPrice ?? null
  }, [
    liveInventory?.data?.tokens?.token0?.amount,
    liveInventory?.data?.tokens?.token1?.amount,
    liveInventory?.data?.tokens?.token0?.decimals,
    liveInventory?.data?.tokens?.token1?.decimals,
    liquidityProfile?.currentPrice,
  ])

  // Calculate APR from TVL and 30d fees
  const calculatedAPR = useMemo(() => {
    const tvl = liveInventory?.data?.totalValueUSD
    const fees30d = vaultDetails?.summary?.fees30d?.usdValue

    if (!tvl || tvl <= 0 || !fees30d || fees30d < 0) {
      return null
    }

    const result = calculateAPR({
      tvl,
      feesEarned: fees30d,
      periodDays: 30,
    })

    return result?.apr ?? null
  }, [liveInventory?.data?.totalValueUSD, vaultDetails?.summary?.fees30d?.usdValue])

  const volumeMetricError =
    priceImpactStatus === 'success' && !vaultDetails?.summary?.volume30d?.usdValue
  const feesMetricError =
    priceImpactStatus === 'success' && !vaultDetails?.summary?.fees30d?.usdValue
  const aprMetricError = priceImpactStatus === 'success' && calculatedAPR === null

  // Use summary.priceImpact which has multiple trade sizes (1K, 2.5K, 5K, 10K, etc.)
  const priceImpactChartData = usePriceImpactChartData(null, vaultDetails?.summary?.priceImpact)
  
  // Fees chart data
  const feesChartData = useFeesChartData(feesHistory)

  // Inventory ratio chart data
  const inventoryChartData = useInventoryRatioChartData(inventoryHistory, inventoryTimeframe)

  return (
    <div className="h-screen flex bg-[#0B0909] text-white overflow-hidden">
      {/* Sidebar */}
      <AppSidebar
        accounts={ACCOUNTS}
        selectedAccountId={selectedAccountId}
        selectedVaultKey={selectedVaultKey}
        onAccountChange={handleAccountChange}
        onVaultSelect={setSelectedVaultKey}
        collapsed={sidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <AppTopBar
          vaults={currentAccountVaults}
          selectedVaultKey={selectedVaultKey || ''}
          onVaultChange={setSelectedVaultKey}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          walletAddress={currentAccountAddress}
          onDisconnect={handleDisconnect}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Charts Container */}
          <div className="p-6">
          <div className="max-w-[1200px] mx-auto space-y-4">
            {/* Vault Metadata Card - always show, with loading state fallback */}
            {selectedVault ? (
              <VaultMetadataCard
                pairName={selectedVault.displayName || 'Unknown Vault'}
                token0Symbol={selectedVault.token0Symbol || 'TKN0'}
                token1Symbol={selectedVault.token1Symbol || 'TKN1'}
                token0Address={(() => {
                  const addr0 = (vaultDetails as any)?.data?.tokens?.token0?.address || (vaultDetails as any)?.data?.token0?.address || vaultDetails?.token0?.address
                  const addr1 = (vaultDetails as any)?.data?.tokens?.token1?.address || (vaultDetails as any)?.data?.token1?.address || vaultDetails?.token1?.address
                  // Fix FOLKS/USDT: swap addresses only for this vault
                  if (selectedVault.key === '56-0xb7f3c2dd386bb750d3e2132a1579d496c5faaf24') {
                    return addr1
                  }
                  return addr0
                })()}
                token1Address={(() => {
                  const addr0 = (vaultDetails as any)?.data?.tokens?.token0?.address || (vaultDetails as any)?.data?.token0?.address || vaultDetails?.token0?.address
                  const addr1 = (vaultDetails as any)?.data?.tokens?.token1?.address || (vaultDetails as any)?.data?.token1?.address || vaultDetails?.token1?.address
                  // Fix FOLKS/USDT: swap addresses only for this vault
                  if (selectedVault.key === '56-0xb7f3c2dd386bb750d3e2132a1579d496c5faaf24') {
                    return addr0
                  }
                  return addr1
                })()}
                exchange={
                  vaultDetails?.exchange || 
                  (() => {
                    const poolName = (vaultDetails as any)?.data?.pool?.name?.toLowerCase() || ''
                    if (poolName.includes('uniswap')) return 'uniswap'
                    if (poolName.includes('pancake')) return 'pancakeswap'
                    if (poolName.includes('aerodrome')) return 'aerodrome'
                    return selectedVault.exchange
                  })()
                }
                vaultVersion={selectedVault.vaultVersion}
                feeTier={
                  vaultDetails?.feeTier || 
                  (typeof (vaultDetails as any)?.data?.pool?.feeTier === 'number' 
                    ? `${(vaultDetails as any).data.pool.feeTier.toFixed(2)}%` 
                    : (vaultDetails as any)?.data?.pool?.feeTier) || 
                  selectedVault.feeTier
                }
                chainId={selectedVault.chainId || 1}
                poolAddress={(vaultDetails as any)?.data?.pool?.address}
                chainName={(vaultDetails as any)?.data?.general?.chain}
                poolUrl={selectedVault.poolUrl}
                volume30d={vaultDetails?.summary?.volume30d?.usdValue}
                fees30d={vaultDetails?.summary?.fees30d?.usdValue}
                apr30d={calculatedAPR ?? undefined}
                loading={priceImpactStatus === 'loading'}
                volumeError={volumeMetricError}
                feesError={feesMetricError}
                aprError={aprMetricError}
              />
            ) : (
              <MetadataCardSkeleton />
            )}

            {/* Distribution Chart + Support Info - Two separate cards with gap */}
            {/* Min-height ensures no layout jumps between loading/content states */}
            <div className="grid grid-cols-12 gap-4" style={{ minHeight: '420px' }}>
              {selectedVault ? (
                <>
                {/* Distribution Chart Card (8 cols) */}
                <div className="col-span-12 lg:col-span-8">
                  <DistributionChartCard
                    tvl={liveInventory?.data?.totalValueUSD}
                    tvlChange={liveInventory?.data?.totalValueUSD ? liveInventory.data.totalValueUSD * 0.04 : undefined}
                    tvlChangePercent={4}
                    isEarning={true}
                    chartData={liquidityProfile?.points || null}
                    leftBound={liquidityProfile?.leftBound || -50}
                    rightBound={liquidityProfile?.rightBound || 50}
                    currentPrice={effectiveCurrentPrice ?? undefined}
                    currentPriceFormatted={
                      effectiveCurrentPrice && 
                      !!liquidityProfile?.points && 
                      liquidityProfile.points.length > 0
                        ? (() => {
                            const rawValue = selectedVault.invertValue 
                              ? (1 / effectiveCurrentPrice)
                              : effectiveCurrentPrice
                            const value = formatPrice(rawValue)
                            const label = selectedVault.showToken0PerToken1
                              ? `${selectedVault.token0Symbol} per ${selectedVault.token1Symbol}`
                              : `${selectedVault.token1Symbol} per ${selectedVault.token0Symbol}`
                            return `${value} ${label}`
                          })()
                        : undefined
                    }
                    token0Symbol={selectedVault.token0Symbol}
                    token1Symbol={selectedVault.token1Symbol}
                    invertValue={selectedVault.invertValue}
                    showToken0PerToken1={selectedVault.showToken0PerToken1}
                    loading={liquidityStatus === 'idle' || liquidityStatus === 'loading'}
                  />
                </div>

                {/* Support Info Card (4 cols) */}
                <div className="col-span-12 lg:col-span-4">
                  <VaultSupportInfoCard
                    token0Symbol={selectedVault.token0Symbol || 'TKN0'}
                    token1Symbol={selectedVault.token1Symbol || 'TKN1'}
                    priceRatio={effectiveCurrentPrice ?? undefined}
                    leftBound={liquidityProfile?.leftBound}
                    rightBound={liquidityProfile?.rightBound}
                    skewPercent={liquidityProfile ? Math.abs(liquidityProfile.weightedCenter) : undefined}
                    skewDirection={
                      liquidityProfile?.weightedCenter
                        ? liquidityProfile.weightedCenter > 5
                          ? 'bullish'
                          : liquidityProfile.weightedCenter < -5
                            ? 'bearish'
                            : 'neutral'
                        : undefined
                    }
                    status={
                      liveInventory?.data?.tokens
                        ? Math.abs(liveInventory.data.tokens.token0.percentage - 50) <= (selectedVault.tolerance || 2)
                          ? 'balanced'
                          : 'unbalanced'
                        : undefined
                    }
                    statusTolerance={selectedVault.tolerance || 2}
                    buyLimit={selectedVault.tolerance || 2}
                    sellLimit={selectedVault.tolerance || 2}
                    token0Percent={liveInventory?.data?.tokens?.token0?.percentage ? Math.round(liveInventory.data.tokens.token0.percentage) : 50}
                    token1Percent={liveInventory?.data?.tokens?.token1?.percentage ? Math.round(liveInventory.data.tokens.token1.percentage) : 50}
                    token0ValueUSD={liveInventory?.data?.tokens?.token0?.valueUSD}
                    token1ValueUSD={liveInventory?.data?.tokens?.token1?.valueUSD}
                    token0Amount={liveInventory?.data?.tokens?.token0?.amount}
                    token1Amount={liveInventory?.data?.tokens?.token1?.amount}
                    token0Decimals={liveInventory?.data?.tokens?.token0?.decimals}
                    token1Decimals={liveInventory?.data?.tokens?.token1?.decimals}
                    token0Color={selectedVault.token0Color}
                    token1Color={selectedVault.token1Color}
                    loading={liquidityStatus === 'idle' || liquidityStatus === 'loading'}
                    hasLiquidityData={
                      !!liquidityProfile?.points && 
                      liquidityProfile.points.length > 0 && 
                      typeof liveInventory?.data?.totalValueUSD === 'number' && 
                      liveInventory.data.totalValueUSD > 0
                    }
                    hasInventoryData={
                      !!liveInventory?.data?.tokens?.token0?.percentage &&
                      !!liveInventory?.data?.tokens?.token1?.percentage
                    }
                    invertValue={selectedVault.invertValue}
                    showToken0PerToken1={selectedVault.showToken0PerToken1}
                  />
                </div>
                </>
              ) : (
                <>
                  {/* Distribution Chart Skeleton (8 cols) */}
                  <div className="col-span-12 lg:col-span-8">
                    <DistributionChartSkeleton />
                  </div>
                  {/* Support Info Skeleton (4 cols) */}
                  <div className="col-span-12 lg:col-span-4">
                    <SupportInfoSkeleton />
                  </div>
                </>
              )}
            </div>

            {/* Charts in horizontal flexbox - consistent h-[260px] for all states */}
            <div className="flex flex-wrap items-stretch justify-center gap-4">
              {/* Price Impact Card */}
              <div className="flex-1 min-w-[300px] max-w-[400px] h-[260px]">
                {priceImpactStatus === 'error' && priceImpactError ? (
                  <ErrorCard title="Price Impact" message={priceImpactError} />
                ) : priceImpactStatus === 'success' ? (
                  <PriceImpactCard
                    data={priceImpactChartData}
                    inefficiencyThreshold={selectedVault?.tolerance || 2}
                  />
                ) : (
                  <LoadingCard type="price-impact" />
                )}
              </div>

              {/* Fees History Card */}
              <div className="flex-1 min-w-[300px] max-w-[400px] h-[260px]">
                {feesStatus === 'success' ? (
                  <FeesHistoryCard
                    data={feesChartData}
                    token0Symbol={vaultDetails?.token0?.symbol || feesHistory?.token0Symbol || 'Token0'}
                    token1Symbol={vaultDetails?.token1?.symbol || feesHistory?.token1Symbol || 'Token1'}
                  />
                ) : (
                  <LoadingCard type="fees" />
                )}
              </div>

              {/* Inventory Ratio Card */}
              <div className="flex-1 min-w-[300px] max-w-[400px] h-[260px]">
                {inventoryStatus === 'success' && selectedVault ? (
                  <InventoryRatioCard
                    data={inventoryChartData}
                    token0Symbol={vaultDetails?.token0?.symbol || inventoryHistory?.metadata?.tokens?.token0?.symbol || 'Token0'}
                    token1Symbol={vaultDetails?.token1?.symbol || inventoryHistory?.metadata?.tokens?.token1?.symbol || 'Token1'}
                    token0Color={selectedVault.token0Color || '#103E36'}
                    token1Color={selectedVault.token1Color || '#2775CA'}
                    initialTimeframe={inventoryTimeframe}
                    onTimeframeChange={setInventoryTimeframe}
                  />
                ) : (
                  <LoadingCard type="inventory" />
                )}
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>
    </div>
  )
}

function LoadingCard({ type }: { type: 'price-impact' | 'fees' | 'inventory' }) {
  if (type === 'price-impact') {
    return (
      <div className="h-[260px] min-h-[260px] rounded-[16px] border border-[#221C1B] bg-[#171312] p-3 flex flex-col">
        <div className="space-y-1">
          <div className="h-3 w-1/4 rounded-full bg-white/10" />
          <div className="h-6 w-1/3 rounded bg-white/10" />
        </div>
        <div className="mt-3 flex-1 rounded-xl bg-gradient-to-b from-white/10 via-white/5 to-transparent">
          <div className="h-full w-full animate-pulse rounded-xl bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent)]" />
        </div>
      </div>
    )
  }

  if (type === 'fees') {
    return (
      <div className="h-[260px] min-h-[260px] rounded-[16px] border border-[#221C1B] bg-[#171312] p-3 flex flex-col">
        <div className="space-y-1">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="h-6 w-24 rounded bg-white/10" />
        </div>
        <div className="mt-3 flex-1 flex items-end justify-between gap-1 px-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="w-[6px] rounded-[1px] bg-white/10 animate-pulse"
              style={{
                height: `${20 + Math.random() * 80}%`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="h-2 w-12 rounded bg-white/10" />
          <div className="h-2 w-12 rounded bg-white/10" />
          <div className="h-2 w-12 rounded bg-white/10" />
        </div>
      </div>
    )
  }

  // inventory
  return (
    <div className="h-[260px] min-h-[260px] rounded-[16px] border border-[#221C1B] bg-[#171312] p-3 flex flex-col">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="h-3 w-28 rounded bg-white/10" />
          <div className="h-6 w-24 rounded bg-white/10" />
        </div>
        <div className="h-7 w-28 rounded-[10px] bg-white/10" />
      </div>
      <div className="mt-3 flex-1 flex items-end justify-between gap-1 px-1">
        {Array.from({ length: 30 }).map((_, i) => {
          const token0Height = 30 + Math.random() * 40
          const token1Height = 100 - token0Height
          return (
            <div key={i} className="flex flex-col w-[6px] h-full justify-end">
              <div
                className="w-full rounded-t-[6px] bg-white/10 animate-pulse"
                style={{
                  height: `${token1Height}%`,
                  animationDelay: `${i * 30}ms`,
                }}
              />
              <div
                className="w-full rounded-b-[6px] bg-white/5 animate-pulse"
                style={{
                  height: `${token0Height}%`,
                  animationDelay: `${i * 30}ms`,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="h-2 w-12 rounded bg-white/10" />
        <div className="h-2 w-12 rounded bg-white/10" />
        <div className="h-2 w-12 rounded bg-white/10" />
      </div>
    </div>
  )
}

// Consistent error card that matches loading/success card dimensions
function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="h-[260px] min-h-[260px] rounded-[16px] border border-[#221C1B] bg-[#171312] p-3 flex flex-col">
      {/* Header - matches other cards */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <p className="text-[12px] leading-[14px] text-[#8E7571]">
          Error
        </p>
        <h3 className="text-base font-medium text-[#F5EBE5] leading-6">
          {title}
        </h3>
      </div>
      {/* Error content - centered in remaining space */}
      <div className="mt-3 flex-1 flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5">
        <svg className="w-8 h-8 text-red-400/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-[12px] text-red-300/80 text-center px-4 max-w-[200px]">
          {message}
        </p>
      </div>
    </div>
  )
}

// Metadata card skeleton - matches VaultMetadataCard dimensions
function MetadataCardSkeleton() {
  return (
    <div 
      className="rounded-[16px] border border-[#221C1B] bg-[#171312] px-4 py-4 sm:px-5"
      style={{ minHeight: '82px' }}
    >
      <div className="flex items-center gap-4">
        {/* Left: token icons + name skeleton (40%) */}
        <div className="flex items-center gap-3" style={{ minWidth: '200px' }}>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse -ml-2" />
          </div>
          <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
          <div className="h-6 w-20 rounded-lg bg-white/10 animate-pulse" />
        </div>
        {/* Right: stats skeleton (60%) */}
        <div className="flex-1 flex justify-around">
          <div className="flex flex-col gap-1 items-start">
            <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
            <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1 items-start">
            <div className="h-3 w-14 rounded bg-white/10 animate-pulse" />
            <div className="h-5 w-20 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1 items-start">
            <div className="h-3 w-12 rounded bg-white/10 animate-pulse" />
            <div className="h-5 w-16 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Distribution chart skeleton
function DistributionChartSkeleton() {
  return (
    <div 
      className="h-full rounded-[16px] border border-[#221C1B] bg-[#171312] p-4 flex flex-col"
      style={{ minHeight: '420px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <div className="h-3 w-8 rounded bg-white/10 animate-pulse" />
          <div className="h-8 w-32 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="h-6 w-16 rounded-full bg-white/10 animate-pulse" />
      </div>
      {/* Chart area */}
      <div className="flex-1 flex items-end justify-between gap-1 px-2">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 max-w-[12px] rounded-t bg-white/10 animate-pulse"
            style={{
              height: `${20 + Math.sin(i * 0.3) * 30 + Math.random() * 20}%`,
              animationDelay: `${i * 25}ms`,
            }}
          />
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between pt-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-3 w-8 rounded bg-white/10 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

// Support info card skeleton
function SupportInfoSkeleton() {
  return (
    <div 
      className="h-full rounded-[16px] border border-[#221C1B] bg-[#171312] p-4 flex flex-col gap-5"
      style={{ minHeight: '460px' }}
    >
      {/* Current Price */}
      <div className="flex flex-col gap-1">
        <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
        <div className="h-6 w-16 rounded bg-white/10 animate-pulse" />
        <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
      </div>
      {/* Price Range */}
      <div className="flex flex-col gap-1">
        <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
        <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
        <div className="h-4 w-12 rounded bg-white/10 animate-pulse" />
      </div>
      {/* Skew */}
      <div className="flex flex-col gap-1">
        <div className="h-3 w-10 rounded bg-white/10 animate-pulse" />
        <div className="h-5 w-16 rounded bg-white/10 animate-pulse" />
        <div className="h-4 w-14 rounded bg-white/10 animate-pulse" />
      </div>
      {/* Status */}
      <div className="flex flex-col gap-1">
        <div className="h-3 w-12 rounded bg-white/10 animate-pulse" />
        <div className="h-5 w-20 rounded bg-white/10 animate-pulse" />
        <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
      </div>
      {/* Live Composition */}
      <div className="flex flex-col gap-1 mt-auto">
        <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
        <div className="flex justify-between">
          <div className="h-5 w-10 rounded bg-white/10 animate-pulse" />
          <div className="h-5 w-10 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 animate-pulse" />
        <div className="flex justify-between">
          <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
