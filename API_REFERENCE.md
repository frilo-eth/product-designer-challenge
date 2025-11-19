# API Reference

Quick reference for available API functions. All functions are in [lib/api.ts](lib/api.ts).

---

## Available Functions

### `fetchVaultDetails(chainId, vaultAddress)`
Returns complete vault information including metadata and summary data (volume, fees, price impact).

**Route:** `GET /api/vaults/{chainId}/{vaultAddress}`

---

### `fetchLiquidityProfile(chainId, vaultAddress)`
Returns liquidity distribution across price ticks.

**Route:** `GET /api/vaults/{chainId}/{vaultAddress}/liquidity`

---

### `fetchLiveInventory(chainId, vaultAddress)`
Returns current token balance snapshot.

**Route:** `GET /api/vaults/{chainId}/{vaultAddress}/live-inventory`

---

### `fetchVaultBalance(chainId, vaultAddress, startDate?, endDate?)`
Returns historical token balance percentages over time (for Vault Composition charts).

**Route:** `GET /api/vaults/{chainId}/{vaultAddress}/vault-balance?startDate=...&endDate=...`

**Defaults:** Defaults to last 30 days if dates not provided

---

### `fetchPriceImpact(chainId, vaultAddress, tradeSize?, startDate?, endDate?)`
Returns historical price impact data for different trade sizes.

**Route:** `GET /api/vaults/{chainId}/{vaultAddress}/price-impact?tradeSize=5000&startDate=...&endDate=...`

**Defaults:** tradeSize: 5000, startDate: '2025-01-01', endDate: '2025-11-19'

---

### `fetchFeesHistory(chainId, vaultAddress, startDate?, endDate?)`
Returns historical fee earnings.

**Route:** `GET /api/vaults/{chainId}/{vaultAddress}/fees-history?startDate=...&endDate=...`

**Defaults:** startDate: '2025-01-01', endDate: '2025-11-19'

---

## Test Vaults

```typescript
export const TEST_VAULTS = [
  { address: '0xe20b37048bec200db1ef35669a4c8a9470ce3288', chainId: 1 }, // Ethereum
  { address: '0x70a8be67675837db9b0c7c36cb629c8aab479e93', chainId: 1 }, // Ethereum
  { address: '0x9f71298ee14176395c36797e65be1169e15f20d4', chainId: 1 }, // Ethereum
  { address: '0xb7f3c2dd386bb750d3e2132a1579d496c5faaf24', chainId: 56 }, // BSC - PancakeSwap V4
  { address: '0x5666af5c1b8d4bfe717a0d065fdc0bb190d49e42', chainId: 8453 }, // Base - Aerodrome
]
```

**Chain IDs:** 1 = Ethereum, 56 = BSC, 8453 = Base

---

## Usage

```typescript
import { fetchVaultDetails, TEST_VAULTS } from '@/lib/api'

// Fetch a specific vault
const vault = await fetchVaultDetails(1, '0xe20b37048bec200db1ef35669a4c8a9470ce3288')

// Fetch using TEST_VAULTS
const { address, chainId } = TEST_VAULTS[0]
const vaultData = await fetchVaultDetails(chainId, address)
```

**Note:** All functions are async and throw errors on failure. Handle them appropriately.

---

## Type Definitions

All TypeScript types are available in [lib/types.ts](lib/types.ts).

Import with:
```typescript
import type { VaultMetadata, LiquidityProfile, InventoryRatio } from '@/lib/types'
```

---

## Response Data

Inspect the raw API responses using the expandable JSON viewer in each vault card, or check the browser Network tab to see the actual data structures returned by each endpoint.
