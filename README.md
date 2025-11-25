# Arrakis Product Designer Challenge

A production-ready Next.js 14 starter repository for the Arrakis product designer challenge. This project provides a foundation for building a beautiful vault analytics dashboard with live data from the Arrakis Indexer API.

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager

### Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd arrakis-product-designer-challenge
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional):
   ```bash
   cp .env.local.example .env.local
   ```
   The app works without environment variables. However, for full wallet functionality, add a WalletConnect project ID:
   ```bash
   # .env.local
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```
   Get a free project ID at [WalletConnect Cloud](https://cloud.walletconnect.com)

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

That's it! You should see the starter dashboard with 5 test vaults.

## 🎯 Quick Links

**👉 [API Reference Guide](API_REFERENCE.md)** - Complete guide to all API functions

- [lib/api.ts](lib/api.ts) - All API helper functions
- [lib/types.ts](lib/types.ts) - TypeScript type definitions

## 📁 Project Structure

```
arrakis-product-designer-challenge/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API proxy routes
│   │   └── vaults/               # Vault API endpoints
│   │       └── [chainId]/
│   │           └── [vaultAddress]/
│   │               ├── route.ts                    # GET vault details
│   │               ├── liquidity/route.ts          # GET liquidity profile
│   │               ├── inventory-ratio/route.ts    # GET inventory ratio
│   │               ├── price-impact/route.ts       # GET price impact
│   │               └── fees-history/route.ts       # GET fees history
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home page (START HERE)
│   └── globals.css               # Global styles with Arrakis theme
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   └── tabs.tsx
│   ├── providers.tsx             # Wagmi & RainbowKit providers
│   ├── vault-card.tsx            # Vault card component
│   └── raw-data-display.tsx      # Collapsible JSON viewer
├── lib/
│   ├── api.ts                    # API helper functions (USE THESE!)
│   ├── types.ts                  # TypeScript type definitions
│   ├── utils.ts                  # Utility functions
│   └── wallet.ts                 # Wallet configuration
├── public/                       # Static assets
├── .env.local                    # Environment variables
├── .env.local.example            # Environment variables template
├── tailwind.config.ts            # Tailwind config with Arrakis colors
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## 🎯 Challenge Objectives

Your task is to design and implement a beautiful, functional vault analytics dashboard that showcases:

### Required Features

1. **Vault Overview**
   - Display key metrics: TVL, APR, volume, fees
   - Token pair information
   - Vault metadata

2. **Liquidity Distribution**
   - Visualize liquidity across price ticks
   - Show current price position
   - Interactive charts

3. **Inventory Ratio**
   - Display token balance over time
   - Show historical trends

4. **Price Impact Analysis**
   - Visualize price impact for different trade sizes
   - Compare across time periods
   - Show buy vs sell impact

5. **Fee Earnings**
   - Historical fee data
   - Daily/weekly/monthly aggregations
   - Fee trends and projections

### Design Requirements

- **Follow Arrakis Brand Guidelines**:
  - Primary: Tabr Orange (`#EC9117`)
  - Hover: Tabr Orange Hover (`#F0B567`)
  - Accent: Spice Blue (`#598CD8`)
  - Background: Dark theme (`#0A0E1A`)

- **User Experience**:
  - Loading states for async operations
  - Error handling with user-friendly messages
  - Smooth animations and transitions
  - Intuitive navigation
  - Responsive design (optional - desktop-first is fine)

- **Data Visualization**:
  - Use Recharts for charts
  - Clear, readable charts with proper labels
  - Interactive tooltips
  - Responsive chart sizing

## 📡 API Endpoints

All API routes are proxied through Next.js to avoid CORS issues.

### Available Endpoints

#### 1. Get Vault Details
```
GET /api/vaults/{chainId}/{vaultAddress}
```
Returns detailed metadata for a specific vault.

**Parameters**:
- `chainId`: Chain ID (e.g., `1` for Ethereum mainnet)
- `vaultAddress`: Vault contract address

**Helper Function**: `fetchVaultDetails(chainId, vaultAddress)`

**Example**:
```typescript
import { fetchVaultDetails } from '@/lib/api'

const vaultData = await fetchVaultDetails(
  1,
  '0xe20b37048bec200db1ef35669a4c8a9470ce3288'
)
```

---

#### 2. Get Liquidity Profile
```
GET /api/vaults/{chainId}/{vaultAddress}/liquidity
```
Returns liquidity distribution across price ticks.

**Helper Function**: `fetchLiquidityProfile(chainId, vaultAddress)`

**Response Structure**:
```typescript
{
  ticks: Array<{
    tickIndex: number
    liquidityNet: string
    liquidityGross: string
    price0: string
    price1: string
  }>
  currentTick: number
  currentPrice: string
  token0Symbol: string
  token1Symbol: string
}
```

---

#### 3. Get Live Inventory
```
GET /api/vaults/{chainId}/{vaultAddress}/live-inventory
```
Returns current token balance snapshot.

**Helper Function**: `fetchLiveInventory(chainId, vaultAddress)`

---

#### 4. Get Vault Balance (Historical Composition)
```
GET /api/vaults/{chainId}/{vaultAddress}/vault-balance
  ?startDate=2025-01-01T00:00:00Z
  &endDate=2025-11-19T23:59:59Z
```
Returns historical token balance percentages over time. Essential for "Vault Composition" charts.

**Parameters**:
- `startDate`: Start date in ISO format (optional, defaults to 30 days ago)
- `endDate`: End date in ISO format (optional, defaults to now)

**Helper Function**: `fetchVaultBalance(chainId, vaultAddress, startDate?, endDate?)`

---

#### 5. Get Price Impact
```
GET /api/vaults/{chainId}/{vaultAddress}/price-impact
  ?tradeSize=5000
  &startDate=2025-01-01
  &endDate=2025-11-19
```
Returns price impact analysis for different trade sizes.

**Parameters**:
- `tradeSize`: Trade size in USD (default: `5000`)
- `startDate`: Start date in YYYY-MM-DD format
- `endDate`: End date in YYYY-MM-DD format

**Helper Function**: `fetchPriceImpact(chainId, vaultAddress, tradeSize, startDate, endDate)`

---

#### 6. Get Fees History
```
GET /api/vaults/{chainId}/{vaultAddress}/fees-history
  ?startDate=2025-01-01
  &endDate=2025-11-19
```
Returns historical fee earnings.

**Parameters**:
- `startDate`: Start date in YYYY-MM-DD format
- `endDate`: End date in YYYY-MM-DD format

**Helper Function**: `fetchFeesHistory(chainId, vaultAddress, startDate, endDate)`

## 🧪 Test Vaults

Five pre-configured test vaults across Ethereum, BSC, and Base:

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

## 💻 Development Guide

### Where to Add Your Code

1. **Main Dashboard Page**: [app/page.tsx](app/page.tsx)
   - This is your starting point
   - Feel free to completely redesign this page
   - Add new sections, layouts, and components

2. **New Components**: `components/`
   - Create new components for your dashboard
   - Example: `components/liquidity-chart.tsx`
   - Example: `components/inventory-chart.tsx`

3. **New Pages**: `app/`
   - Create new pages if needed
   - Example: `app/vault/[address]/page.tsx` for individual vault pages

4. **Styling**: [tailwind.config.ts](tailwind.config.ts) & [app/globals.css](app/globals.css)
   - Arrakis brand colors are already configured
   - Add custom styles as needed

### Using API Functions

All API functions are in [lib/api.ts](lib/api.ts). Use them like this:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { fetchVaultDetails, fetchLiquidityProfile } from '@/lib/api'
import type { VaultMetadata, LiquidityProfile } from '@/lib/types'

export default function VaultPage() {
  const [vault, setVault] = useState<VaultMetadata | null>(null)
  const [liquidity, setLiquidity] = useState<LiquidityProfile | null>(null)

  useEffect(() => {
    async function loadData() {
      const chainId = 1
      const address = '0xe20b37048bec200db1ef35669a4c8a9470ce3288'

      const vaultData = await fetchVaultDetails(chainId, address)
      const liquidityData = await fetchLiquidityProfile(chainId, address)

      setVault(vaultData)
      setLiquidity(liquidityData)
    }

    loadData()
  }, [])

  // Render your components...
}
```

### Using shadcn/ui Components

Pre-installed components:
- `Button` - [components/ui/button.tsx](components/ui/button.tsx)
- `Card` - [components/ui/card.tsx](components/ui/card.tsx)
- `Badge` - [components/ui/badge.tsx](components/ui/badge.tsx)
- `Tabs` - [components/ui/tabs.tsx](components/ui/tabs.tsx)

Example usage:

```typescript
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vault Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge>ETH/USDC</Badge>
        <Button>View Details</Button>
      </CardContent>
    </Card>
  )
}
```

### Using Recharts

Recharts is included for data visualization:

```typescript
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export function MyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#EC9117"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

## 🎨 Arrakis Brand Colors

All colors are configured in [tailwind.config.ts](tailwind.config.ts):

```typescript
// Usage in className
className="bg-arrakis-orange"           // #EC9117
className="hover:bg-arrakis-orange-hover" // #F0B567
className="text-arrakis-blue"           // #598CD8
className="bg-arrakis-dark"             // #0A0E1A
```

## 🔌 Wallet Integration

RainbowKit is configured in **mock mode** for the challenge. This means:
- No real wallet required
- Users can "connect" with a demo wallet
- Perfect for testing and development

The wallet configuration is in [lib/wallet.ts](lib/wallet.ts).

## 🛠 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint
```

## 📦 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Web3**: RainbowKit + wagmi + viem (mock mode)
- **API**: Arrakis Indexer API v3

## 📤 Submission Guidelines

When you're ready to submit:

1. **Code Quality**:
   - Ensure your code is well-commented
   - Follow TypeScript best practices
   - Remove any unused code or console.logs

2. **Testing**:
   - Test on multiple browsers (Chrome, Firefox, Safari)
   - Test on different screen sizes
   - Verify all API calls work correctly

3. **Documentation**:
   - Update this README if you add new features
   - Document any new components or utilities
   - Add comments to complex logic

4. **Deployment** (Optional):
   - Deploy to Vercel, Netlify, or your preferred platform
   - Include the deployment URL in your submission

## 📝 Decision Log

- **2025‑11‑25 – KPI change indicators**  
  30-day delta percentages for Volume, Fees, and APR remain computed behind the scenes, but the dashboard now hides their on-card values until the upstream API stabilizes. A subtle indicator dot still exposes the captured dollar (or percentage for APR) change via tooltip so product stakeholders can access the data without risking misinterpretation.

---

## 🎨 Challenge Submission - Design Documentation

### ✅ Feature Implementation Status

All required features from the challenge have been implemented:

| Feature | Status | Implementation |
|---------|--------|----------------|
| **Vault Overview** | ✅ Complete | `VaultMetadataCard` - TVL, APR, 30D Volume, 30D Fees with token pair icons |
| **Liquidity Distribution** | ✅ Complete | `DistributionChartCard` - Interactive bar chart with current price marker, range bounds |
| **Inventory Ratio** | ✅ Complete | `InventoryRatioCard` - Stacked bar chart with 24H/1W/30D timeframe selector |
| **Price Impact Analysis** | ✅ Complete | `PriceImpactCard` - Dual-line chart with buy/sell curves, threshold indicators |
| **Fee Earnings** | ✅ Complete | `FeesHistoryCard` - Historical fees with daily data visualization |

### 🧱 Architecture Decisions

#### Component Structure
```
components/
├── dashboard/
│   ├── data-viz/          # Chart cards (Distribution, Fees, Inventory, PriceImpact)
│   ├── widgets/           # Metadata cards (VaultMetadataCard, MetricCard)
│   └── layouts/           # App shell (Sidebar, TopBar)
├── liquidity/             # Liquidity-specific components
├── ui/                    # shadcn/ui primitives
└── charts/                # Legacy chart components (v1)
```

#### Design Token System
We established a consistent design token system matching the Figma specifications:
```typescript
const COLORS = {
  surface: '#171312',      // Card backgrounds
  background: '#0B0909',   // Page background
  border: '#221C1B',       // Subtle borders
  wormbone: '#F5EBE5',     // Primary text
  muted: '#8E7571',        // Secondary text
  accent: '#3BE38B',       // Active/current price
  token0: '#2775CA',       // USDC blue
  token1: '#103E36',       // Base token green
}
```

#### Data Flow
1. **API Layer** (`lib/api.ts`) - Centralized fetch functions with error handling
2. **Custom Hooks** (`lib/hooks/`) - Data transformation and state management
3. **Chart Components** - Recharts-based visualizations with custom tooltips

### 🎯 UX Decisions

#### Loading States
- **Skeleton loaders** match exact heights of loaded content to prevent layout jumps
- **Harmonic loading coordination** - Charts appear together when data is ready
- **Graceful degradation** - Partial data displays with clear error indicators

#### Empty/Error States
- **"Data eaten by sandworms"** - Playful error illustration for fees chart (Figma-matched)
- **Desert illustration** - Empty state for TVL chart (brand-aligned)
- **"API Error" badges** - Clear visual indicators with tooltip explanations

#### Tooltips
- **Contextual information** - Each stat has an info tooltip explaining its meaning
- **Chart tooltips** - Show precise values at hover point
- **Price tooltips** - Display actual price at liquidity bars, not just percentages

#### Interactions
- **Price switcher** - Toggle between token0/token1 price display
- **Timeframe selectors** - 24H/1W/30D for inventory ratio
- **Hover states** - Bars dim when another is hovered for focus

### ⚠️ Limits & Challenges

#### API Constraints
1. **Fees History** - Returns daily data only; 24H view shows minimal data points
2. **Price Impact** - Data range fixed at $1K-$100K; we extrapolate for deep liquidity vaults
3. **Some vaults return 400 errors** - Handled gracefully with error states

#### Technical Constraints
1. **Recharts limitations** - Custom X-axis labels rendered outside chart for better spacing
2. **Next.js 14 hydration** - Some console warnings from RainbowKit (suppressed in dev)

### 🚀 Improvements for Next Week

If given another week, we would focus on:

1. **Performance Optimizations**
   - Implement React Query for data caching
   - Add SWR for stale-while-revalidate patterns
   - Prefetch vault data on hover

2. **Additional Features**
   - Historical TVL chart with timeframe selector
   - Position calculator for LPs
   - Comparison view between vaults
   - Export data functionality

3. **Polish**
   - More granular loading states (shimmer effects)
   - Keyboard navigation for accessibility
   - Mobile-optimized layouts
   - Dark/light theme toggle

4. **Testing**
   - Unit tests for data transformation functions
   - E2E tests with Playwright
   - Visual regression tests

### 📦 Component Inventory

#### New Components Created

| Component | Location | Description |
|-----------|----------|-------------|
| `DistributionChartCard` | `components/dashboard/data-viz/` | TVL + liquidity distribution chart |
| `VaultSupportInfoCard` | `components/dashboard/data-viz/` | Price, range, skew, status panel |
| `FeesHistoryCard` | `components/dashboard/data-viz/` | 30D fees bar chart |
| `InventoryRatioCard` | `components/dashboard/data-viz/` | Composition over time |
| `PriceImpactCard` | `components/dashboard/data-viz/` | Buy/sell impact curves |
| `VaultMetadataCard` | `components/dashboard/widgets/` | Header with pair info + KPIs |
| `LiquidityProfileChart` | `components/liquidity/` | Alternative liquidity viz |
| `InfoTooltip` | Inline | Hover tooltips for stats |
| `TokenIcon` | Inline | Dynamic token SVG loader |

#### Custom Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useChartData` | `lib/hooks/` | Chart data transformation |
| `useLoadingCoordinator` | `lib/hooks/` | Synchronize loading states |

### 🔗 Key URLs

- **Vaults List**: `/vaults`
- **Vault Dashboard**: `/vault/[chainId]/[address]`
- **API Observability**: `/data-dashboard`
- **Home**: `/`

### 🙏 Acknowledgments

Built with the Arrakis Indexer API, following the brand guidelines provided. Design inspiration from the Figma file with adaptations for technical feasibility and UX best practices.

## 🔧 Troubleshooting

### WebSocket / WalletConnect Errors

If you see errors like:
```
Error: WebSocket connection closed abnormally with code: 3000 (Unauthorized: invalid key)
```

**Solution**: This is a WalletConnect configuration issue. The dashboard works fine without wallet connection. To fix:

1. **Get a WalletConnect Project ID**:
   - Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
   - Create a free account and new project
   - Copy your project ID

2. **Add to environment variables**:
   ```bash
   # Create .env.local file
   echo "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here" > .env.local
   ```

3. **Restart the dev server**:
   ```bash
   npm run dev
   ```

**Note**: The error is suppressed in development mode and won't affect the main dashboard functionality. Wallet features are optional for this challenge.

### API Errors

If API calls fail:
- Check your internet connection
- Verify the Arrakis Indexer API is accessible
- Some vaults may return 400 errors if data isn't available (this is expected)

## 🎉 Good Luck!

We're excited to see what you build! If you have any questions about the requirements or run into technical issues, don't hesitate to reach out.

Remember: We're looking for both **design skills** and **technical implementation**. Show us your best work!
