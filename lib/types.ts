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

export interface VaultSummary {
  priceImpact?: {
    timeAt: string
    buy?: Record<string, number>
    sell?: Record<string, number>
  }
  marketDepth2pr?: {
    timeAt: string
    buy: number
    sell: number
  } | null
  volume30d?: {
    usdValue: number
  } | null
  fees30d?: {
    usdValue: number
  } | null
  vaultVsHolding?: any | null
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
  summary?: VaultSummary | null
  timestamp?: string
  lastUpdated?: string
  cached?: boolean
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
// Live Inventory Types
// ============================================

export interface LiveInventoryResponse {
  chainId: number
  vaultId: string
  data: {
    totalValueUSD: number
    utilizationPercentage: number
    tokens: {
      token0: {
        symbol: string
        address: string
        amount: string
        valueUSD: number
        percentage: number
        decimals: number
        utilizationPercentage: number
      }
      token1: {
        symbol: string
        address: string
        amount: string
        valueUSD: number
        percentage: number
        decimals: number
        utilizationPercentage: number
      }
    }
    lastPriceUpdate: string
  }
  timestamp: string
  lastUpdated: string
  cached: boolean
}

// ============================================
// Vault Balance (Historical Composition) Types
// ============================================

export interface VaultBalanceDataPoint {
  timestamp: string
  totalValueUSD: number
  tokens: {
    token0: {
      amount: string
      valueUSD: number
      price: number
      percentage: number
    }
    token1: {
      amount: string
      valueUSD: number
      price: number
      percentage: number
    }
  }
}

export interface VaultBalanceResponse {
  chainId: number
  vaultId: string
  metadata: {
    tokens: {
      token0: {
        symbol: string
        address: string
        decimals: number
      }
      token1: {
        symbol: string
        address: string
        decimals: number
      }
    }
    requestedStartDate: string
    requestedEndDate: string
    requestedHours: number
    actualHoursAvailable: number
    bucketSizeHours: number
  }
  data: VaultBalanceDataPoint[]
  timestamp: string
  lastUpdated: string
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
