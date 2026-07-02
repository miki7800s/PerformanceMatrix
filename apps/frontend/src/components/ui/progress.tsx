import * as React from 'react'
import { cn } from '@/utils/cn'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value, e.g. 103 for 103 %. */
  value: number | null
  /**
   * Upper bound of the track. KPIs regularly exceed 100 %, so the
   * caller passes a data-driven max instead of clamping at 100.
   */
  max?: number
  indicatorColor?: string
}

/** Progress bar that never clamps values above 100 %. */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 120, indicatorColor, ...props }, ref) => {
    const safeValue = value ?? 0
    const effectiveMax = Math.max(max, safeValue)
    const width = effectiveMax > 0 ? (safeValue / effectiveMax) * 100 : 0
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={effectiveMax}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
          className,
        )}
        {...props}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{
            width: `${Math.max(0, Math.min(100, width))}%`,
            backgroundColor: indicatorColor,
          }}
        />
      </div>
    )
  },
)
Progress.displayName = 'Progress'

export { Progress }
