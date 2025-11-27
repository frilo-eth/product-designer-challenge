/**
 * API Helper Functions
 *
 * These functions provide typed interfaces to the Arrakis API proxy routes.
 * All API calls are proxied through Next.js API routes to avoid CORS issues.
 */

import type {
  VaultMetadata,
  LiquidityProfile,
  LiveInventoryResponse,
  VaultBalanceResponse,
  PriceImpactResponse,
  PriceImpactDataPoint,
  FeesHistoryResponse,
  ApiError,
} from './types'

const API_BASE = '/api/vaults'

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    let errorMessage = response.statusText
    let errorDetails: any = null
    
    try {
      const errorData = await response.json()
      if (errorData.error) {
        errorMessage = errorData.error
      }
      if (errorData.message) {
        errorMessage = errorData.message
      }
      errorDetails = errorData
    } catch {
      // If JSON parsing fails, try text
      try {
        const errorText = await response.text()
        errorMessage = errorText || errorMessage
      } catch {
        // Use default error message
      }
    }
    
    const error: ApiError = {
      error: 'API Error',
      message: errorMessage,
      statusCode: response.status,
    }
    
    if (typeof window !== 'undefined') {
      console.error(`API Error [${response.status}]:`, {
        url,
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        errorDetails,
      })
    }
    
    throw error
  }

  const data = await response.json()
  return data as T
}

// ============================================
// Vault API Functions
// ============================================

/**
 * Fetch detailed metadata for a specific vault
 *
 * @param chainId - The blockchain chain ID (e.g., 1 for Ethereum mainnet)
 * @param vaultAddress - The vault contract address
 * @returns Detailed vault metadata
 */
export async function fetchVaultDetails(
  chainId: number,
  vaultAddress: string
): Promise<VaultMetadata> {
  return apiFetch<VaultMetadata>(`${API_BASE}/${chainId}/${vaultAddress}`)
}

/**
 * Fetch liquidity distribution across price ticks
 *
 * @param chainId - The blockchain chain ID
 * @param vaultAddress - The vault contract address
 * @returns Liquidity profile with tick data
 */
export async function fetchLiquidityProfile(
  chainId: number,
  vaultAddress: string
): Promise<LiquidityProfile> {
  return apiFetch<LiquidityProfile>(
    `${API_BASE}/${chainId}/${vaultAddress}/liquidity`
  )
}

/**
 * Fetch live inventory (current token balance snapshot)
 *
 * @param chainId - The blockchain chain ID
 * @param vaultAddress - The vault contract address
 * @returns Current inventory state
 */
export async function fetchLiveInventory(
  chainId: number,
  vaultAddress: string
): Promise<LiveInventoryResponse> {
  return apiFetch<LiveInventoryResponse>(
    `${API_BASE}/${chainId}/${vaultAddress}/live-inventory`
  )
}

/**
 * Fetch historical vault balance composition over time
 *
 * @param chainId - The blockchain chain ID
 * @param vaultAddress - The vault contract address
 * @param startDate - Start date in ISO format (default: 30 days ago)
 * @param endDate - End date in ISO format (default: now)
 * @returns Historical token balance percentages over time
 */
export async function fetchVaultBalance(
  chainId: number,
  vaultAddress: string,
  startDate?: string,
  endDate?: string
): Promise<VaultBalanceResponse> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const queryString = params.toString()
  const url = `${API_BASE}/${chainId}/${vaultAddress}/vault-balance${queryString ? `?${queryString}` : ''}`

  return apiFetch<VaultBalanceResponse>(url)
}

/**
 * Fetch historical price impact data
 *
 * @param chainId - The blockchain chain ID
 * @param vaultAddress - The vault contract address
 * @param tradeSize - Trade size in USD (e.g., 5000)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Price impact data points
 */
type ArrakisPriceImpactDatum = {
  timestamp: string
  buyImpacts?: Record<string, number>
  sellImpacts?: Record<string, number>
}

type ArrakisPriceImpactResponse = {
  chainId: number
  vaultId: string
  metadata?: {
    requestedStartDate?: string
    requestedEndDate?: string
    usdValue?: number[]
  }
  data?: ArrakisPriceImpactDatum[]
  timestamp?: string
  lastUpdated?: string
}

export async function fetchPriceImpact(
  chainId: number,
  vaultAddress: string,
  tradeSize: number = 5000,
  startDate?: string,
  endDate?: string
): Promise<PriceImpactResponse> {
  // Convert YYYY-MM-DD format to ISO format with time
  const formatDateForAPI = (dateStr: string): string => {
    // If already in ISO format, return as-is
    if (dateStr.includes('T')) {
      return dateStr
    }
    // Convert YYYY-MM-DD to ISO format
    return `${dateStr}T00:00:00Z`
  }

  // Default to last 30 days if not provided
  if (!startDate && !endDate) {
    const defaultRange = getFeesHistoryDateRange(30)
    startDate = defaultRange.startDate
    endDate = defaultRange.endDate
  } else if (!startDate) {
    // If only endDate is provided, default startDate to 30 days before
    const defaultRange = getFeesHistoryDateRange(30)
    startDate = defaultRange.startDate
  } else if (!endDate) {
    // If only startDate is provided, default endDate to today
    endDate = new Date().toISOString().split('T')[0]
  }

  // At this point, both dates are guaranteed to be defined
  const formattedStartDate = formatDateForAPI(startDate!)
  const formattedEndDate = formatDateForAPI(endDate!)

  const params = new URLSearchParams({
    tradeSize: tradeSize.toString(),
    startDate: formattedStartDate,
    endDate: formattedEndDate,
  })

  const url = `${API_BASE}/${chainId}/${vaultAddress}/price-impact?${params}`
  
  const raw = await apiFetch<ArrakisPriceImpactResponse>(url)

  const normalized: PriceImpactDataPoint[] =
    raw.data?.flatMap((entry) => {
      const points: PriceImpactDataPoint[] = []

      const addPoints = (
        impacts: Record<string, number> | undefined,
        direction: PriceImpactDataPoint['direction']
      ) => {
        if (!impacts) return

        Object.entries(impacts).forEach(([size, value]) => {
          const numeric = typeof value === 'number' ? value : Number(value)
          if (!Number.isFinite(numeric)) {
            return
          }
          points.push({
            timestamp: entry.timestamp,
            tradeSize: size,
            priceImpactPercent: Math.abs(numeric),
            priceImpactBps: Math.abs(numeric) * 100,
            direction,
          })
        })
      }

      addPoints(entry.buyImpacts, 'buy')
      addPoints(entry.sellImpacts, 'sell')

      return points
    }) ?? []

  return {
    data: normalized,
    tradeSize: tradeSize.toString(),
    startDate: raw.metadata?.requestedStartDate ?? formattedStartDate,
    endDate: raw.metadata?.requestedEndDate ?? formattedEndDate,
  }
}

/**
 * Helper function to get date range for fees history
 */
export function getFeesHistoryDateRange(days: 7 | 30 | 365): { startDate: string; endDate: string } {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

/**
 * Fetch historical fee earnings
 *
 * @param chainId - The blockchain chain ID
 * @param vaultAddress - The vault contract address
 * @param startDate - Start date in YYYY-MM-DD format (will be converted to ISO). Defaults to 30 days ago.
 * @param endDate - End date in YYYY-MM-DD format (will be converted to ISO). Defaults to today.
 * @returns Historical fee data
 */
export async function fetchFeesHistory(
  chainId: number,
  vaultAddress: string,
  startDate?: string,
  endDate?: string
): Promise<FeesHistoryResponse> {
  // Convert YYYY-MM-DD format to ISO format with time
  const formatDateForAPI = (dateStr: string): string => {
    // If already in ISO format, return as-is
    if (dateStr.includes('T')) {
      return dateStr
    }
    // Convert YYYY-MM-DD to ISO format
    return `${dateStr}T00:00:00Z`
  }

  // Default to last 30 days if not provided
  if (!startDate && !endDate) {
    const defaultRange = getFeesHistoryDateRange(30)
    startDate = defaultRange.startDate
    endDate = defaultRange.endDate
  } else if (!startDate) {
    // If only endDate is provided, default startDate to 30 days before
    const defaultRange = getFeesHistoryDateRange(30)
    startDate = defaultRange.startDate
  } else if (!endDate) {
    // If only startDate is provided, default endDate to today
    endDate = new Date().toISOString().split('T')[0]
  }

  // At this point, both dates are guaranteed to be defined
  const formattedStartDate = formatDateForAPI(startDate!)
  const formattedEndDate = formatDateForAPI(endDate!)
  
  const params = new URLSearchParams({
    startDate: formattedStartDate,
    endDate: formattedEndDate,
  })

  const url = `${API_BASE}/${chainId}/${vaultAddress}/fees-history?${params}`

  return apiFetch<FeesHistoryResponse>(url)
}

/**
 * Fetch fees history for last 7 days
 */
export async function fetchFeesHistory7D(
  chainId: number,
  vaultAddress: string
): Promise<FeesHistoryResponse> {
  const { startDate, endDate } = getFeesHistoryDateRange(7)
  return fetchFeesHistory(chainId, vaultAddress, startDate, endDate)
}

/**
 * Fetch fees history for last 365 days
 */
export async function fetchFeesHistory365D(
  chainId: number,
  vaultAddress: string
): Promise<FeesHistoryResponse> {
  const { startDate, endDate } = getFeesHistoryDateRange(365)
  return fetchFeesHistory(chainId, vaultAddress, startDate, endDate)
}

// ============================================
// Convenience function for test vaults
// ============================================

/**
 * Default test vaults across multiple chains
 */
export const TEST_VAULTS = [
  { address: '0xe20b37048bec200db1ef35669a4c8a9470ce3288', chainId: 1 }, // Ethereum
  { address: '0x70a8be67675837db9b0c7c36cb629c8aab479e93', chainId: 1 }, // Ethereum
  { address: '0x9f71298ee14176395c36797e65be1169e15f20d4', chainId: 1 }, // Ethereum
  { address: '0xb7f3c2dd386bb750d3e2132a1579d496c5faaf24', chainId: 56 }, // BSC - PancakeSwap V4
  { address: '0x5666af5c1b8d4bfe717a0d065fdc0bb190d49e42', chainId: 8453 }, // Base - Aerodrome
]

/**
 * Fetch details for all test vaults
 *
 * @returns Array of vault metadata for all test vaults
 */
export async function fetchTestVaults(): Promise<VaultMetadata[]> {
  const promises = TEST_VAULTS.map(({ address, chainId }) =>
    fetchVaultDetails(chainId, address)
  )

  return Promise.all(promises)
}
