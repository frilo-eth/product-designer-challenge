# Contributing Guide

This guide provides helpful tips and best practices for working on your Arrakis product designer challenge submission.

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your changes in real-time.

### 2. Making Changes

The hot-reload is enabled, so your changes will appear immediately in the browser.

### 3. Testing Your Build

Before submitting, always test the production build:

```bash
npm run build
npm run start
```

This ensures there are no build-time errors.

## Component Organization

### Creating New Components

1. **UI Components** → `components/ui/`
   - Reusable, generic components
   - Example: buttons, inputs, modals

2. **Feature Components** → `components/`
   - Feature-specific components
   - Example: vault-card, liquidity-chart

3. **Page Components** → `app/`
   - Page-level components
   - Use Next.js App Router conventions

### Component Template

```typescript
/**
 * ComponentName
 *
 * Brief description of what this component does
 */

'use client' // If it uses hooks or browser APIs

import * as React from 'react'

interface ComponentNameProps {
  // Props definition
}

export function ComponentName({ ...props }: ComponentNameProps) {
  // Component logic

  return (
    // JSX
  )
}
```

## Styling Best Practices

### Use Tailwind Classes

```typescript
// Good
<div className="bg-arrakis-orange hover:bg-arrakis-orange-hover">

// Avoid inline styles unless necessary
<div style={{ backgroundColor: '#EC9117' }}>
```

### Responsive Design

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Content */}
</div>
```

### Dark Theme

All Arrakis colors are designed for dark backgrounds. Use semantic color names:

```typescript
className="bg-slate-900 text-slate-100 border-slate-700"
```

## Data Fetching Patterns

### Client-Side Fetching

```typescript
'use client'

import { useEffect, useState } from 'react'
import { fetchVaultDetails } from '@/lib/api'
import type { VaultMetadata } from '@/lib/types'

export function VaultComponent() {
  const [data, setData] = useState<VaultMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const result = await fetchVaultDetails(1, '0x...')
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!data) return null

  return <div>{/* Render data */}</div>
}
```

### Server-Side Fetching (Server Components)

```typescript
// No 'use client' directive

import { fetchVaultDetails } from '@/lib/api'

export default async function VaultPage({
  params,
}: {
  params: { address: string }
}) {
  const data = await fetchVaultDetails(1, params.address)

  return <div>{/* Render data */}</div>
}
```

## Chart Guidelines

### Using Recharts

```typescript
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export function MyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#EC9117"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### Chart Color Palette

Use Arrakis brand colors for consistency:

- Primary line: `#EC9117` (Tabr Orange)
- Secondary line: `#598CD8` (Spice Blue)
- Grid: `#334155` (Slate)
- Text: `#94a3b8` (Slate 400)
- Background: `#0f172a` (Slate 900)

## TypeScript Tips

### Always Define Types

```typescript
// Good
interface VaultData {
  address: string
  tvl: string
  apr: string
}

function displayVault(data: VaultData) {
  // ...
}

// Avoid 'any'
function displayVault(data: any) {
  // ...
}
```

### Use Existing Types

Import types from `lib/types.ts` instead of redefining them:

```typescript
import type { VaultMetadata, LiquidityProfile } from '@/lib/types'
```

## Performance Optimization

### Memoization

```typescript
import { useMemo, useCallback } from 'react'

function ExpensiveComponent({ data }) {
  const processedData = useMemo(() => {
    // Expensive calculation
    return data.map(/* ... */)
  }, [data])

  const handleClick = useCallback(() => {
    // Handler logic
  }, [])

  return <div>{/* ... */}</div>
}
```

### Code Splitting

Use dynamic imports for large components:

```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false,
})
```

## Accessibility

### Semantic HTML

```typescript
// Good
<button onClick={handleClick}>Click me</button>

// Avoid
<div onClick={handleClick}>Click me</div>
```

### ARIA Labels

```typescript
<button aria-label="Close modal" onClick={onClose}>
  <X className="h-4 w-4" />
</button>
```

### Keyboard Navigation

Ensure all interactive elements are keyboard-accessible.

## Git Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "Add liquidity distribution chart component"
git commit -m "Fix vault card loading state animation"
git commit -m "Update API error handling with user feedback"

# Avoid
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
```

## Common Pitfalls

### 1. Forgetting 'use client' Directive

If you use hooks or browser APIs, add `'use client'` at the top:

```typescript
'use client'

import { useState } from 'react'
```

### 2. Not Handling Loading States

Always show loading states for async operations:

```typescript
if (loading) return <Skeleton />
```

### 3. Hardcoding Values

Use constants and configuration:

```typescript
// Good
const ETHEREUM_MAINNET = 1
const vaultAddress = TEST_VAULTS[0]

// Avoid
const chainId = 1
const address = '0x...'
```

### 4. Ignoring TypeScript Errors

Never use `@ts-ignore` or `any` to bypass type errors. Fix them properly.

## Testing Your Work

### Visual Testing Checklist

- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile (320px width)
- [ ] Test on tablet (768px width)
- [ ] Test on desktop (1920px width)
- [ ] Check loading states
- [ ] Check error states
- [ ] Check empty states
- [ ] Verify animations are smooth
- [ ] Ensure text is readable
- [ ] Check color contrast

### Functional Testing Checklist

- [ ] All API calls work correctly
- [ ] Error handling displays user-friendly messages
- [ ] Charts render with correct data
- [ ] Navigation works as expected
- [ ] Wallet connection works (mock mode)
- [ ] All links and buttons work
- [ ] Page loads without console errors

## Getting Help

### Debugging Tips

1. **Check Browser Console**: Look for errors or warnings
2. **Check Network Tab**: Verify API calls are successful
3. **Check Next.js Terminal**: Look for build errors or warnings
4. **Use React DevTools**: Inspect component state and props

### Resources

- Next.js Docs: https://nextjs.org/docs
- Tailwind CSS Docs: https://tailwindcss.com/docs
- Recharts Examples: https://recharts.org/en-US/examples
- TypeScript Handbook: https://www.typescriptlang.org/docs/

## Final Submission Checklist

Before submitting, ensure:

- [ ] Code builds successfully (`npm run build`)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] All features work as expected
- [ ] Code is well-commented
- [ ] README is updated if needed
- [ ] Git history is clean with meaningful commits
- [ ] Project runs on fresh install (`npm install && npm run dev`)

Good luck with your submission!
