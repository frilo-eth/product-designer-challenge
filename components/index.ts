/**
 * Components Index
 *
 * Centralizes exports for commonly used UI pieces so that any consumer can
 * import from `@/components` instead of drilling into nested folders.
 * 
 * Structure:
 * - /v1          - Original working components (preserved for backwards compatibility)
 * - /dashboard   - New dashboard UI components (Arrakis design system)
 * - /ui          - Shared shadcn/ui primitives
 * - /providers   - App-level providers (Wagmi, React Query, RainbowKit)
 */

// ========================================
// V1 Components (Backwards Compatibility)
// ========================================
// These are maintained for existing pages and can be gradually migrated
export { FeesChart, InventoryRatioChart, LiquidityDistributionChart, PriceImpactChart } from './charts'
// Note: LiquidityProfileChart is exported from ./liquidity, not ./charts, to avoid duplicate exports
export { LiquidityProfileChart, LiquidityProfilePills } from './liquidity'

export { Providers } from './providers'
export { RawDataDisplay } from './raw-data-display'
export { VaultCard } from './vault-card'

// ========================================
// Dashboard V2 Components (New)
// ========================================
// Import new dashboard components from '@/components/dashboard'
// Example: import { MetricCard } from '@/components/dashboard'
export * from './dashboard'

// ========================================
// Shared UI Primitives
// ========================================
// Re-export selected UI primitives for convenience
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
export { Button } from './ui/button'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
export { Badge } from './ui/badge'
export { Skeleton } from './ui/skeleton'
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
export { ErrorAwareValue } from './ui/error-aware-value'

