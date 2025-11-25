'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LucideIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface MetricCardProps {
  /** Display title of the metric */
  title: string
  /** Primary value to display */
  value: string | number
  /** Optional subtitle or secondary information */
  subtitle?: string
  /** Optional icon component from lucide-react */
  icon?: LucideIcon
  /** Optional tooltip explanation */
  tooltip?: string
  /** Highlight the metric with orange accent */
  highlight?: boolean
  /** Loading state */
  loading?: boolean
  /** Error message if data failed to load */
  error?: string
  /** Optional trend indicator (+/- percentage) */
  trend?: {
    value: number
    label?: string
  }
}

/**
 * MetricCard - Dashboard widget for displaying key performance indicators
 * 
 * A flexible card component for showing metrics with optional icons, tooltips, and trends.
 * Follows the Arrakis design system with black background and orange accents.
 * 
 * @example
 * ```tsx
 * <MetricCard
 *   title="Total Value Locked"
 *   value="$1,234,567"
 *   icon={DollarSign}
 *   highlight
 *   trend={{ value: 12.5, label: "vs last week" }}
 * />
 * ```
 */
export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tooltip,
  highlight = false,
  loading = false,
  error,
  trend,
}: MetricCardProps) {
  // Loading state
  if (loading) {
    return (
      <Card className="border-white/[0.08] bg-black/40">
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-24 mb-3 bg-white/5" />
          <Skeleton className="h-8 w-32 mb-2 bg-white/10" />
          {subtitle && <Skeleton className="h-3 w-20 bg-white/5" />}
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-white/[0.08] bg-black/40">
        <CardContent className="pt-6">
          <p className="text-sm text-white/40 mb-2">{title}</p>
          <p className="text-2xl font-bold text-white/30">N/A</p>
          <p className="text-xs text-white/30 mt-2">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const borderClass = highlight 
    ? 'border-[#EC9117]/30 bg-[#EC9117]/[0.03]' 
    : 'border-white/[0.08] bg-black/40'
  
  const iconColor = highlight ? 'text-[#EC9117]' : 'text-white/50'
  const valueColor = highlight ? 'text-[#EC9117]' : 'text-white'

  return (
    <Card className={`${borderClass} hover:border-white/[0.12] transition-all`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {tooltip ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-sm text-white/40 cursor-help inline-flex items-center gap-1">
                      {title}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-black/95 border-white/[0.12] text-white">
                    <p className="text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <p className="text-sm text-white/40">{title}</p>
            )}
          </div>
          {Icon && <Icon className={`h-5 w-5 ${iconColor}`} />}
        </div>

        <div className="space-y-1">
          <p className={`text-2xl font-bold ${valueColor}`}>
            {value}
          </p>
          
          {subtitle && (
            <p className="text-xs text-white/40">
              {subtitle}
            </p>
          )}

          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-medium ${
                trend.value >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
              </span>
              {trend.label && (
                <span className="text-xs text-white/30">{trend.label}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

