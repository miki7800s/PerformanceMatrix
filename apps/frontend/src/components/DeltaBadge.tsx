import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'

interface DeltaBadgeProps {
  /** Difference (b − a); null when either side is missing. */
  delta: number | null
  /** How to format the number. */
  format: (value: number) => string
  /** Whether an increase is good (default) or bad. */
  positiveIsGood?: boolean
  className?: string
}

/** Signed change indicator with direction arrow and status color. */
export function DeltaBadge({
  delta,
  format,
  positiveIsGood = true,
  className,
}: DeltaBadgeProps) {
  if (delta === null || Number.isNaN(delta)) {
    return <span className="text-sm text-muted-foreground">–</span>
  }
  const rounded = Math.abs(delta) < 0.005 ? 0 : delta
  const good = rounded === 0 ? null : rounded > 0 === positiveIsGood
  const Icon = rounded === 0 ? Minus : rounded > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums',
        good === null && 'text-muted-foreground',
        good === true && 'text-[#2e7d00] dark:text-[#5ed312]',
        good === false && 'text-[#b02020] dark:text-[#f07575]',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {rounded > 0 ? '+' : ''}
      {format(rounded)}
    </span>
  )
}
