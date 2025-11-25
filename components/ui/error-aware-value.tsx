'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle } from 'lucide-react'

interface ErrorAwareValueProps {
  value: number | null | undefined
  formatter?: (val: number) => string
  errorCondition: boolean
  errorMessage: string
  fallback?: string
  className?: string
}

export function ErrorAwareValue({
  value,
  formatter = (val) => val.toLocaleString(),
  errorCondition,
  errorMessage,
  fallback = 'N/A',
  className = '',
}: ErrorAwareValueProps) {
  // Only show error if errorCondition is true OR value is null/undefined
  // Note: value === 0 is valid and should NOT trigger error state
  const hasError = errorCondition || value === null || value === undefined

  if (hasError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`${className} inline-flex items-center gap-1 cursor-help`}>
              <span className="text-muted-foreground">{fallback}</span>
              <AlertCircle className="h-3 w-3 text-yellow-500" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{errorMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Value is valid (including 0), format and display it
  return <span className={className}>{formatter(value as number)}</span>
}

