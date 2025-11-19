/**
 * API Helper Functions
 *
 * These functions provide typed interfaces to the Arrakis API proxy routes.
 * All API calls are proxied through Next.js API routes to avoid CORS issues.
 */

import type {
  VaultMetadata,
  VaultsListResponse,
  LiquidityProfile,
  InventoryRatio,
  PriceImpactResponse,
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
    const error: ApiError = {
      error: 'API Error',
      message: `Failed to fetch: ${response.statusText}`,
      statusCode: response.status,
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
 * Fetch list of all available vaults
 *
 * @returns List of vaults with basic metadata
 */
export async function fetchVaultsList(): Promise<VaultsListResponse> {
  return apiFetch<VaultsListResponse>(`${API_BASE}`)
}

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
 * Fetch inventory ratio (base/quote token distribution over time)
 *
 * @param chainId - The blockchain chain ID
 * @param vaultAddress - The vault contract address
 * @returns Inventory ratio data points
 */
export async function fetchInventoryRatio(
  chainId: number,
  vaultAddress: string
): Promise<InventoryRatio> {
  return apiFetch<InventoryRatio>(
    `${API_BASE}/${chainId}/${vaultAddress}/inventory-ratio`
  )
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
export async function fetchPriceImpact(
  chainId: number,
  vaultAddress: string,
  tradeSize: number = 5000,
  startDate: string = '2025-01-01',
  endDate: string = '2025-11-19'
): Promise<PriceImpactResponse> {
  const params = new URLSearchParams({
    tradeSize: tradeSize.toString(),
    startDate,
    endDate,
  })

  return apiFetch<PriceImpactResponse>(
    `${API_BASE}/${chainId}/${vaultAddress}/price-impact?${params}`
  )
}

/**
 * Fetch historical fee earnings
 *
 * @param chainId - The blockchain chain ID
 * @param vaultAddress - The vault contract address
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Historical fee data
 */
export async function fetchFeesHistory(
  chainId: number,
  vaultAddress: string,
  startDate: string = '2025-01-01',
  endDate: string = '2025-11-19'
): Promise<FeesHistoryResponse> {
  const params = new URLSearchParams({
    startDate,
    endDate,
  })

  return apiFetch<FeesHistoryResponse>(
    `${API_BASE}/${chainId}/${vaultAddress}/fees-history?${params}`
  )
}

// ============================================
// Convenience function for test vaults
// ============================================

/**
 * Default test vault addresses on Ethereum mainnet
 */
export const TEST_VAULTS = [
  '0xe20b37048bec200db1ef35669a4c8a9470ce3288',
  '0x70a8be67675837db9b0c7c36cb629c8aab479e93',
  '0x9f71298ee14176395c36797e65be1169e15f20d4',
]

/**
 * Fetch details for all test vaults
 *
 * @returns Array of vault metadata for all test vaults
 */
export async function fetchTestVaults(): Promise<VaultMetadata[]> {
  const ETHEREUM_MAINNET = 1

  const promises = TEST_VAULTS.map(address =>
    fetchVaultDetails(ETHEREUM_MAINNET, address)
  )

  return Promise.all(promises)
}
