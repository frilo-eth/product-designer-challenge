# Components Structure Guide

This document explains the organization of components in the Arrakis Vault Dashboard.

## 📁 Directory Structure

```
components/
├── v1/                    # Original components (preserved)
│   ├── charts/            # Original chart components
│   ├── liquidity/         # Original liquidity visualizations
│   └── index.ts           # V1 exports
│
├── dashboard/             # NEW: V2 Dashboard UI
│   ├── widgets/           # Modular data display components
│   ├── layouts/           # Grid systems & structural components
│   ├── data-viz/          # Custom charts & visualizations
│   ├── overlays/          # Modals, tooltips, popovers
│   ├── primitives/        # Atomic design elements
│   ├── README.md          # Dashboard component guide
│   └── index.ts           # Dashboard exports
│
├── ui/                    # Shared shadcn/ui primitives
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── tooltip.tsx
│   └── ...
│
├── providers.tsx          # App-level providers (Wagmi, RainbowKit, etc.)
├── index.ts               # Main exports (backwards compatible)
└── STRUCTURE.md           # This file
```

## 🎯 Design System

### Color Palette

```css
/* Main Background */
--bg-main: #0B0909;        /* Darkest black */
--bg-card: rgba(0,0,0,0.4); /* Semi-transparent black */

/* Borders & Dividers */
--border: rgba(255,255,255,0.08); /* Subtle white */

/* Text */
--text-primary: #FFFFFF;    /* White */
--text-secondary: rgba(255,255,255,0.6); /* Gray */
--text-muted: rgba(255,255,255,0.4); /* Lighter gray */

/* Accent (Use Sparingly!) */
--accent: #EC9117;          /* Arrakis Orange */
```

### Usage Guidelines

**Arrakis Orange (`#EC9117`) should ONLY be used for:**
- Primary CTAs and important actions
- Hover states on interactive elements
- Key metrics and data points (APR, fees, etc.)
- Active states and selections
- Critical alerts or highlights

**DO NOT use orange for:**
- Regular text
- Backgrounds (except very subtle opacity)
- Borders (except on hover)
- Decorative elements

## 🚀 Migration Strategy

### Phase 1: Setup (Current)
✅ Preserve V1 components in `/v1` folder  
✅ Create `/dashboard` structure for new components  
✅ Maintain backwards compatibility  

### Phase 2: Build New Dashboard
- Create new components in `/dashboard` following design specs
- Test new components in isolation
- Keep existing pages working with V1 components

### Phase 3: Gradual Migration
- Update pages one by one to use new dashboard components
- Compare side-by-side with V1 for consistency
- Remove V1 components once fully migrated

## 📦 Import Patterns

### V1 Components (Current Implementation)
```tsx
import { FeesChart, InventoryRatioChart } from '@/components'
// or
import { FeesChart } from '@/components/v1'
```

### Dashboard V2 Components (New)
```tsx
import { MetricCard, ChartWidget } from '@/components/dashboard'
// or
import { MetricCard } from '@/components/dashboard/widgets'
```

### Shared UI Primitives
```tsx
import { Card, Button, Badge } from '@/components/ui'
// or
import { Card } from '@/components'
```

## 🎨 Creating New Dashboard Components

### Component Template

```tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MyComponentProps {
  /** Add JSDoc comments for all props */
  title: string
  value: string | number
  loading?: boolean
  error?: string
}

/**
 * MyComponent - Brief description
 * 
 * Longer description of what this component does and when to use it.
 */
export function MyComponent({ 
  title, 
  value, 
  loading = false, 
  error 
}: MyComponentProps) {
  // Loading state
  if (loading) {
    return (
      <Card className="border-white/[0.08] bg-black/40">
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-24 mb-2 bg-white/5" />
          <Skeleton className="h-8 w-32 bg-white/10" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-white/[0.08] bg-black/40">
        <CardContent className="pt-6">
          <p className="text-sm text-white/40">{title}</p>
          <p className="text-white/60">N/A</p>
          <p className="text-xs text-white/30 mt-1">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // Success state
  return (
    <Card className="border-white/[0.08] bg-black/40 hover:border-[#EC9117]/30 transition-all">
      <CardContent className="pt-6">
        <p className="text-sm text-white/40 mb-2">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  )
}
```

### Checklist for New Components
- [ ] TypeScript types with JSDoc comments
- [ ] Loading state with Skeleton
- [ ] Error state with helpful message
- [ ] Success state with data
- [ ] Responsive design (test mobile)
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Hover states where appropriate
- [ ] Dark theme optimized
- [ ] Orange accent used sparingly

## 🔗 Resources

- [Figma Design](https://www.figma.com/design/yNa1f7BBQyqhlxy6kpRda3/Arrakis-Challenge) - Source of truth for design
- [shadcn/ui](https://ui.shadcn.com/) - UI primitive reference
- [Recharts](https://recharts.org/) - Charting library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

## 💡 Tips

1. **Start Small**: Build one component at a time, test thoroughly
2. **Reference V1**: Look at working V1 components for data fetching patterns
3. **Consistency**: Follow the established color palette and spacing
4. **Performance**: Use React.memo for expensive components
5. **Accessibility**: Always include proper ARIA labels
6. **Documentation**: Add JSDoc comments to all props and functions

## 🆘 Need Help?

- Check `/dashboard/README.md` for dashboard-specific guidance
- Look at V1 implementations in `/v1` for working examples
- Review shadcn/ui docs for primitive usage patterns
- Test in Storybook or component playground before integrating

