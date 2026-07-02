import * as React from 'react'
import { cn } from '@/utils/cn'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

/**
 * Lightweight CSS tooltip (hover + keyboard focus), dependency-free.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: TooltipProps) {
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-40 w-max max-w-56 -translate-x-1/2 rounded-md border bg-card px-2.5 py-1.5 text-xs text-card-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {content}
      </span>
    </span>
  )
}
