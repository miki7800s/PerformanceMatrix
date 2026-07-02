import { useState, type ReactNode } from 'react'
import type { OperatorRecord } from '@/types'
import { useOperatorHistory } from '@/hooks/useHistoryData'
import { useTheme } from '@/hooks/useTheme'
import { useSettings } from '@/hooks/useSettings'
import { getVizColors, toneColor } from '@/components/charts/chartTheme'
import {
  formatDecimal,
  formatPercent,
  getPerformanceTone,
} from '@/utils/format'
import { average } from '@/utils/analytics'
import { Sparkline } from '@/components/Sparkline'
import { DeltaBadge } from '@/components/DeltaBadge'
import { CsatValue, PercentValue } from '@/components/PerformanceValue'
import { cn } from '@/utils/cn'

function HoverContent({ operator }: { operator: OperatorRecord }) {
  const { theme } = useTheme()
  const { settings } = useSettings()
  const colors = getVizColors(theme)
  const history = useOperatorHistory(operator.fullName)

  const color = toneColor(
    getPerformanceTone(operator.totalPerformance, settings.thresholds),
    colors,
  )
  const tpHistory = history.records.map((r) => r.totalPerformance)
  const previous =
    history.records.length >= 2
      ? history.records[history.records.length - 2]
      : null
  const delta =
    previous?.totalPerformance != null && operator.totalPerformance != null
      ? operator.totalPerformance - previous.totalPerformance
      : null
  const csat = average([
    operator.csatCallAverage,
    operator.csatChatAverage,
    operator.csatCctAverage,
  ])

  return (
    <div className="w-72 rounded-xl border bg-card p-4 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{operator.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {operator.manager}
          </p>
        </div>
        <span
          className="text-lg font-bold tabular-nums"
          style={{ color }}
        >
          {formatPercent(operator.totalPerformance)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">
            Produktivita
          </p>
          <PercentValue value={operator.productivity} />
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">CSAT Ø</p>
          <CsatValue value={csat} />
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">
            Int. Rating
          </p>
          <PercentValue value={operator.internalRating} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">
            vs. minulé období
          </p>
          {delta !== null ? (
            <DeltaBadge
              delta={delta}
              format={(v) => `${formatDecimal(v)} p. b.`}
            />
          ) : (
            <span className="text-xs text-muted-foreground">bez historie</span>
          )}
        </div>
        <div style={{ color }}>
          <Sparkline values={tpHistory} width={96} height={28} />
        </div>
      </div>
    </div>
  )
}

interface OperatorHoverCardProps {
  operator: OperatorRecord
  children: ReactNode
  className?: string
}

/**
 * Smart hover: rich operator card (KPIs, delta vs previous period,
 * mini trend) shown after a short hover delay. History loads lazily
 * on first hover.
 */
export function OperatorHoverCard({
  operator,
  children,
  className,
}: OperatorHoverCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-40 -translate-x-1/2 pb-2 animate-in fade-in-0 zoom-in-95 duration-150">
          <HoverContent operator={operator} />
        </div>
      )}
    </span>
  )
}
