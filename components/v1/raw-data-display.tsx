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
    <div className="mt-4 border border-white/[0.08] rounded-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-black/40 hover:bg-black/60 text-left text-sm font-medium flex items-center justify-between transition-colors text-white"
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 bg-black">
          <pre className="text-xs overflow-x-auto">
            <code className="text-[#EC9117]">
              {JSON.stringify(data, null, 2)}
            </code>
          </pre>
        </div>
      )}
    </div>
  )
}
