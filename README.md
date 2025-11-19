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

3. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   The default configuration should work out of the box.

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

That's it! You should see the starter dashboard with 3 test vaults.

## 🎯 Quick Links

**👉 [API Reference Guide](API_REFERENCE.md)** - Complete guide to all API functions with examples

- [lib/api.ts](lib/api.ts) - All API helper functions
- [lib/types.ts](lib/types.ts) - TypeScript type definitions
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development best practices

## 📁 Project Structure

```
arrakis-product-designer-challenge/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API proxy routes
│   │   └── vaults/               # Vault API endpoints
│   │       ├── route.ts          # GET /api/vaults (list all)
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
   - Highlight rebalancing events

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
  - Responsive design (mobile, tablet, desktop)
  - Loading states for async operations
  - Error handling with user-friendly messages
  - Smooth animations and transitions
  - Intuitive navigation

- **Data Visualization**:
  - Use Recharts for charts
  - Clear, readable charts with proper labels
  - Interactive tooltips
  - Responsive chart sizing

## 📡 API Endpoints

All API routes are proxied through Next.js to avoid CORS issues.

### Available Endpoints

#### 1. List All Vaults
```
GET /api/vaults
```
Returns a list of all available vaults.

**Helper Function**: `fetchVaultsList()`

---

#### 2. Get Vault Details
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

#### 3. Get Liquidity Profile
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

#### 4. Get Inventory Ratio
```
GET /api/vaults/{chainId}/{vaultAddress}/inventory-ratio
```
Returns token balance distribution over time.

**Helper Function**: `fetchInventoryRatio(chainId, vaultAddress)`

**Response Structure**:
```typescript
{
  data: Array<{
    timestamp: string
    token0Amount: string
    token1Amount: string
    token0Ratio: number
    token1Ratio: number
    totalValueUSD?: string
  }>
  token0Symbol: string
  token1Symbol: string
}
```

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

Three pre-configured test vaults on Ethereum mainnet:

```typescript
export const TEST_VAULTS = [
  '0xe20b37048bec200db1ef35669a4c8a9470ce3288',
  '0x70a8be67675837db9b0c7c36cb629c8aab479e93',
  '0x9f71298ee14176395c36797e65be1169e15f20d4',
]
```

All are on **Ethereum mainnet** (chainId: `1`).

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

## 💡 Tips & Best Practices

1. **TypeScript**: All API responses are fully typed. Use the types in [lib/types.ts](lib/types.ts).

2. **Error Handling**: Always handle loading and error states in your components.

3. **Performance**: Use React's `useMemo` and `useCallback` for expensive operations.

4. **Responsive Design**: Test on mobile, tablet, and desktop sizes.

5. **Accessibility**: Use semantic HTML and ARIA labels where appropriate.

6. **Code Organization**: Keep components small and focused. Create custom hooks for complex logic.

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill the process on port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm run dev
```

### API errors
- Check that `.env.local` exists and contains the correct API URL
- Check the browser console for detailed error messages
- Verify the vault address and chain ID are correct

### Build errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Recharts Documentation](https://recharts.org/en-US/)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs/introduction)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

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

## 🎉 Good Luck!

We're excited to see what you build! If you have any questions about the requirements or run into technical issues, don't hesitate to reach out.

Remember: We're looking for both **design skills** and **technical implementation**. Show us your best work!

---

Built with ❤️ for the Arrakis Product Designer Challenge
