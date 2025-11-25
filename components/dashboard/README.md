# Dashboard Components - V2

This directory contains the new dashboard UI components following the Arrakis design system.

## 🎨 Design Philosophy

- **Strongly Visual**: Inspired by shadcn/ui aesthetic
- **All Black Theme**: `#0B0909` background with Arrakis orange (`#EC9117`) accents
- **Minimalist**: Clean, modern, and data-focused
- **Performance First**: Optimized for smooth animations and interactions

## 📁 Structure

```
dashboard/
├── widgets/          # Dashboard widget components (KPI cards, charts, etc.)
├── layouts/          # Dashboard layout components (grid, sections, etc.)
├── data-viz/         # New data visualization components
├── overlays/         # Modals, tooltips, popovers
└── primitives/       # Atomic design elements specific to dashboard
```

## 🚀 Getting Started

All new components should:
1. Follow the black theme with orange accents
2. Use TypeScript with proper types
3. Be fully accessible (ARIA labels, keyboard navigation)
4. Include loading and error states
5. Be responsive (mobile-first approach)

## 🎯 Component Checklist

When creating a new component:
- [ ] TypeScript types defined
- [ ] Props interface documented
- [ ] Loading state implemented
- [ ] Error state implemented
- [ ] Responsive design tested
- [ ] Accessibility verified
- [ ] Dark theme optimized

## 💡 Example Component

```tsx
import { Card, CardContent } from '@/components/ui/card'

interface DashboardWidgetProps {
  title: string
  value: string | number
  loading?: boolean
  error?: string
}

export function DashboardWidget({ title, value, loading, error }: DashboardWidgetProps) {
  if (loading) return <WidgetSkeleton />
  if (error) return <WidgetError message={error} />
  
  return (
    <Card className="border-white/[0.08] bg-black/40">
      <CardContent className="pt-6">
        <h3 className="text-sm text-white/40 mb-2">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  )
}
```

## 🔗 Related

- [V1 Components](../v1/) - Original implementation (preserved for reference)
- [UI Components](../ui/) - Shared shadcn/ui primitives
- [Figma Design](https://www.figma.com/design/yNa1f7BBQyqhlxy6kpRda3/Arrakis-Challenge) - Design source

