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

### `fetchInventoryRatio(chainId, vaultAddress)`
Returns token balance distribution over time.

**Route:** `GET /api/vaults/{chainId}/{vaultAddress}/inventory-ratio`

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

### `fetchVaultsList()`
Returns list of all available vaults.

**Route:** `GET /api/vaults`

---

## Test Vaults

```typescript
export const TEST_VAULTS = [
  '0xe20b37048bec200db1ef35669a4c8a9470ce3288',
  '0x70a8be67675837db9b0c7c36cb629c8aab479e93',
  '0x9f71298ee14176395c36797e65be1169e15f20d4',
]
```

All on Ethereum mainnet (chainId: 1)

---

## Usage

```typescript
import { fetchVaultDetails } from '@/lib/api'

const vault = await fetchVaultDetails(1, '0xe20b37048bec200db1ef35669a4c8a9470ce3288')
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
