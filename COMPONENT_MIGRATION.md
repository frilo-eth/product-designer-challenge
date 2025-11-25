# Component Migration Guide

## ✅ What We've Done

We've successfully reorganized the component structure to prepare for building a fresh dashboard UI while preserving all existing work.

### New Structure

```
components/
│
├── v1/                           # ✅ PRESERVED - Original working components
│   ├── charts/                   # Original chart implementations
│   │   ├── FeesChart.tsx
│   │   ├── InventoryRatioChart.tsx
│   │   ├── LiquidityDistributionChart.tsx
│   │   ├── PriceImpactChart.tsx
│   │   └── index.ts
│   │
│   ├── liquidity/                # Original liquidity components
│   │   ├── LiquidityProfileChart.tsx
│   │   ├── LiquidityProfilePills.tsx
│   │   └── index.ts
│   │
│   ├── vault-card.tsx            # Original vault card
│   ├── raw-data-display.tsx      # Original data display
│   └── index.ts                  # V1 exports
│
├── dashboard/                    # 🆕 NEW - Fresh dashboard UI
│   ├── widgets/                  # Data display widgets
│   │   ├── MetricCard.tsx       # ✅ Example component ready
│   │   └── index.ts
│   │
│   ├── layouts/                  # Grid systems & structural components
│   │   └── index.ts
│   │
│   ├── data-viz/                 # Custom charts & visualizations
│   │   └── index.ts
│   │
│   ├── overlays/                 # Modals, tooltips, popovers
│   │   └── index.ts
│   │
│   ├── primitives/               # Atomic design elements
│   │   └── index.ts
│   │
│   ├── README.md                 # Dashboard component guide
│   └── index.ts                  # Dashboard exports
│
├── ui/                           # Shared shadcn/ui primitives (unchanged)
├── providers.tsx                 # App providers (unchanged)
├── index.ts                      # Main exports (updated for both v1 & v2)
└── STRUCTURE.md                  # Component structure documentation
```

## 🎯 Design System (Black Theme)

### Color Palette
```css
Background:    #0B0909           /* Darkest black */
Cards:         rgba(0,0,0,0.4)   /* Semi-transparent */
Borders:       rgba(255,255,255,0.08) /* Subtle white */
Text Primary:  #FFFFFF           /* White */
Text Secondary: rgba(255,255,255,0.6) /* Gray */
Accent:        #EC9117           /* Arrakis Orange - USE SPARINGLY */
```

### Orange Accent Usage (ONLY FOR)
✅ Primary CTAs
✅ Hover states
✅ Key metrics (APR, fees)
✅ Active states
✅ Critical highlights

❌ DO NOT use for regular text, backgrounds, or decorative elements

## 📦 Import Patterns

### Existing Pages (Continue Using V1)
```tsx
// These imports still work - backwards compatible
import { FeesChart, InventoryRatioChart } from '@/components'
import { VaultCard } from '@/components'
```

### New Dashboard Components
```tsx
// Import from dashboard
import { MetricCard } from '@/components/dashboard'
// or more specific
import { MetricCard } from '@/components/dashboard/widgets'
```

### Shared UI Primitives
```tsx
// These work from anywhere
import { Card, Button, Badge } from '@/components/ui'
import { Card } from '@/components' // Also works via barrel export
```

## 🚀 Getting Started with New Components

### 1. Use the MetricCard Template

```tsx
import { MetricCard } from '@/components/dashboard'
import { DollarSign } from 'lucide-react'

export function MyDashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard
        title="Total Value Locked"
        value="$1,234,567"
        icon={DollarSign}
        highlight
        tooltip="Total value of assets in the vault"
      />
      
      <MetricCard
        title="APR (30d)"
        value="45.2%"
        highlight
        trend={{ value: 12.5, label: "vs last week" }}
      />
      
      <MetricCard
        title="Active Positions"
        value="1,234"
        subtitle="Across 5 vaults"
      />
    </div>
  )
}
```

### 2. Create New Components in `/dashboard`

Follow this pattern:
1. Create component in appropriate subfolder (`widgets/`, `data-viz/`, etc.)
2. Export from subfolder's `index.ts`
3. Component automatically available via `@/components/dashboard`

### 3. Component Checklist

Every new component should have:
- [ ] TypeScript types with JSDoc
- [ ] Loading state (use `<Skeleton />`)
- [ ] Error state (show "N/A" with message)
- [ ] Success state with data
- [ ] Responsive design
- [ ] Accessibility (ARIA labels)
- [ ] Hover states (where appropriate)
- [ ] Orange accent used sparingly

## 📚 Resources

- **[components/STRUCTURE.md](./components/STRUCTURE.md)** - Detailed structure guide
- **[components/dashboard/README.md](./components/dashboard/README.md)** - Dashboard component guide
- **[Figma Design](https://www.figma.com/design/yNa1f7BBQyqhlxy6kpRda3/Arrakis-Challenge)** - Design source of truth

## 🔄 Migration Strategy

### Phase 1: ✅ COMPLETE
- [x] Preserve V1 components in `/v1`
- [x] Create `/dashboard` structure
- [x] Set up barrel exports
- [x] Maintain backwards compatibility
- [x] Create example `MetricCard` component

### Phase 2: BUILD (Current)
- [ ] Create dashboard layout components
- [ ] Build new data visualization components
- [ ] Create overlay components (modals, tooltips)
- [ ] Develop primitive components (badges, indicators)
- [ ] Test components in isolation

### Phase 3: INTEGRATE
- [ ] Create new dashboard page
- [ ] Migrate vault detail pages
- [ ] Update existing routes gradually
- [ ] A/B test with V1 components

### Phase 4: CLEANUP
- [ ] Remove V1 components once fully migrated
- [ ] Consolidate shared utilities
- [ ] Final optimization pass

## 💡 Next Steps

1. **Review the Design System**
   - Read `components/STRUCTURE.md` for detailed guidelines
   - Study the `MetricCard` example component
   - Check out the Figma designs

2. **Start Building**
   - Create components in `/dashboard` subfolders
   - Follow the established patterns
   - Test thoroughly before integrating

3. **Maintain Quality**
   - Write JSDoc comments
   - Add proper TypeScript types
   - Include loading and error states
   - Test accessibility

4. **Stay Consistent**
   - Use the black theme consistently
   - Apply orange accent sparingly
   - Follow spacing and typography guidelines
   - Match the Figma designs

## 🆘 Questions?

- Check the documentation in `components/STRUCTURE.md`
- Look at V1 implementations for reference
- Review the `MetricCard` example for patterns
- Test in browser before committing

---

**Ready to build?** Start creating components in `/dashboard` and they'll automatically be available via `@/components/dashboard`! 🚀

