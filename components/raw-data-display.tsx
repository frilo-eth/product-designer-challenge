/**
 * RawDataDisplay Component
 *
 * Displays raw API response data in a collapsible/expandable section
 * Useful for developers to inspect the actual data structure
 */

'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RawDataDisplayProps {
  data: any
  title?: string
  defaultExpanded?: boolean
}

export function RawDataDisplay({
  data,
  title = 'Raw API Response',
  defaultExpanded = false,
}: RawDataDisplayProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  return (
    <div className="mt-4 border border-slate-700 rounded-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-left text-sm font-medium flex items-center justify-between transition-colors"
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 bg-slate-950">
          <pre className="text-xs overflow-x-auto">
            <code className="text-green-400">
              {JSON.stringify(data, null, 2)}
            </code>
          </pre>
        </div>
      )}
    </div>
  )
}
