/**
 * TypeScript types for Arrakis API responses
 *
 * These types define the structure of data returned from the Arrakis Indexer API.
 * Use these types when fetching data from the API routes.
 */

// ============================================
// Vault Types
// ============================================

export interface VaultToken {
  address: string
  symbol: string
  decimals: number
  name?: string
}

export interface VaultMetadata {
  vaultAddress: string
  chainId: number
  name: string
  symbol: string
  token0: VaultToken
  token1: VaultToken
  totalSupply: string
  tvl: string
  apr?: string
  feeTier?: string
  exchange?: string
  createdAt?: string
}

export interface Vault {
  id: string
  chainId: number
  address: string
  metadata: VaultMetadata
}

export interface VaultsListResponse {
  vaults: Vault[]
  total: number
}

// ============================================
// Liquidity Profile Types
// ============================================

export interface LiquidityTick {
  tickIndex: number
  liquidityNet: string
  liquidityGross: string
  price0: string
  price1: string
}

export interface LiquidityProfile {
  ticks: LiquidityTick[]
  currentTick: number
  currentPrice: string
  token0Symbol: string
  token1Symbol: string
}

// ============================================
// Inventory Types
// ============================================

export interface InventoryDataPoint {
  timestamp: string
  token0Amount: string
  token1Amount: string
  token0Ratio: number
  token1Ratio: number
  totalValueUSD?: string
}

export interface InventoryRatio {
  data: InventoryDataPoint[]
  token0Symbol: string
  token1Symbol: string
}

// ============================================
// Price Impact Types
// ============================================

export interface PriceImpactDataPoint {
  timestamp: string
  tradeSize: string
  priceImpactBps: number
  priceImpactPercent: number
  direction: 'buy' | 'sell'
}

export interface PriceImpactResponse {
  data: PriceImpactDataPoint[]
  tradeSize: string
  startDate: string
  endDate: string
}

// ============================================
// Fees History Types
// ============================================

export interface FeesDataPoint {
  timestamp: string
  date: string
  fees0: string
  fees1: string
  feesUSD: string
  volume0?: string
  volume1?: string
  volumeUSD?: string
}

export interface FeesHistoryResponse {
  data: FeesDataPoint[]
  totalFees: string
  startDate: string
  endDate: string
  token0Symbol: string
  token1Symbol: string
}

// ============================================
// API Error Types
// ============================================

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

// ============================================
// API Response Wrapper
// ============================================

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError }
