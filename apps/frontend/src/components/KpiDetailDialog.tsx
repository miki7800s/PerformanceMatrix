import { useMemo } from 'react'
import type { OperatorMetricKey, OperatorRecord } from '@/types'
import { average, rankAndPercentile } from '@/utils/analytics'
import { formatDecimal } from '@/utils/format'
import { CsatValue, PercentValue } from '@/components/PerformanceValue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface KpiDetailTarget {
  metricKey: OperatorMetricKey
  label: string
  kind: 'percent' | 'csat'
}

interface KpiDetailDialogProps {
  target: KpiDetailTarget | null
  onClose: () => void
  operator: OperatorRecord
  /** All records of the active period (company scope). */
  companyRecords: OperatorRecord[]
}

/**
 * Drill-down for a single KPI: operator value vs. company and team
 * averages plus rank and percentile within both groups.
 */
export function KpiDetailDialog({
  target,
  onClose,
  operator,
  companyRecords,
}: KpiDetailDialogProps) {
  const stats = useMemo(() => {
    if (!target) return null
    const key = target.metricKey
    const value = operator[key]
    const teamRecords = companyRecords.filter(
      (r) => r.manager === operator.manager,
    )
    const companyValues = companyRecords.map((r) => r[key])
    const teamValues = teamRecords.map((r) => r[key])
    return {
      value,
      companyAvg: average(companyValues),
      teamAvg: average(teamValues),
      company: rankAndPercentile(value, companyValues),
      team: rankAndPercentile(value, teamValues),
    }
  }, [target, operator, companyRecords])

  const renderValue = (value: number | null) =>
    target?.kind === 'percent' ? (
      <PercentValue value={value} className="text-base" />
    ) : (
      <CsatValue value={value} className="text-base" />
    )

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target?.label}</DialogTitle>
          <DialogDescription>
            {operator.fullName} · {operator.period}
          </DialogDescription>
        </DialogHeader>
        {stats && target && (
          <div className="space-y-1 text-sm">
            {[
              { label: 'Hodnota operátora', node: renderValue(stats.value) },
              { label: 'Průměr firmy', node: renderValue(stats.companyAvg) },
              {
                label: `Průměr týmu (${operator.manager})`,
                node: renderValue(stats.teamAvg),
              },
              {
                label: 'Pořadí ve firmě',
                node: (
                  <span className="font-semibold tabular-nums">
                    {stats.company.rank !== null
                      ? `${stats.company.rank}. z ${stats.company.total}`
                      : '–'}
                  </span>
                ),
              },
              {
                label: 'Pořadí v týmu',
                node: (
                  <span className="font-semibold tabular-nums">
                    {stats.team.rank !== null
                      ? `${stats.team.rank}. z ${stats.team.total}`
                      : '–'}
                  </span>
                ),
              },
              {
                label: 'Percentil ve firmě',
                node: (
                  <span className="font-semibold tabular-nums">
                    {stats.company.percentile !== null
                      ? `${formatDecimal(stats.company.percentile)}. percentil`
                      : '–'}
                  </span>
                ),
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b py-2.5 last:border-0"
              >
                <span className="text-muted-foreground">{row.label}</span>
                {row.node}
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              Percentil udává, kolik procent operátorů má stejnou nebo nižší
              hodnotu.{' '}
              {target.kind === 'percent' &&
                'Hodnoty nad 100 % jsou v pořádku – 100 % není maximum.'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
