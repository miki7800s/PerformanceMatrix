import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { OperatorRecord } from '@/types'
import { useReportData } from '@/hooks/useReportData'
import * as db from '@/services/db'
import { computeSummary, type DashboardSummary } from '@/utils/analytics'
import { formatDecimal, formatInt, formatPercent } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { DeltaBadge } from '@/components/DeltaBadge'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PeriodComparisonChart } from '@/components/charts/PeriodComparisonChart'

interface MetricRow {
  label: string
  a: number | null
  b: number | null
  format: (value: number | null) => string
  formatDelta: (value: number) => string
}

function buildRows(
  a: DashboardSummary,
  b: DashboardSummary,
): MetricRow[] {
  const percent = (v: number | null) => formatPercent(v)
  const percentDelta = (v: number) => `${formatPercent(v).replace(' %', '')} p. b.`
  const decimal = (v: number | null) => formatDecimal(v)
  const decimalDelta = (v: number) => formatDecimal(v)
  const int = (v: number | null) => formatInt(v)
  const intDelta = (v: number) => formatInt(v)
  return [
    {
      label: 'Počet operátorů',
      a: a.operatorCount,
      b: b.operatorCount,
      format: int,
      formatDelta: intDelta,
    },
    {
      label: 'Počet manažerů',
      a: a.managerCount,
      b: b.managerCount,
      format: int,
      formatDelta: intDelta,
    },
    {
      label: 'Ø Total Performance',
      a: a.avgTotalPerformance,
      b: b.avgTotalPerformance,
      format: percent,
      formatDelta: percentDelta,
    },
    {
      label: 'Ø Productivity',
      a: a.avgProductivity,
      b: b.avgProductivity,
      format: percent,
      formatDelta: percentDelta,
    },
    {
      label: 'Ø Internal Rating',
      a: a.avgInternalRating,
      b: b.avgInternalRating,
      format: percent,
      formatDelta: percentDelta,
    },
    {
      label: 'Ø CSAT Call',
      a: a.avgCsatCall,
      b: b.avgCsatCall,
      format: decimal,
      formatDelta: decimalDelta,
    },
    {
      label: 'Ø CSAT Chat',
      a: a.avgCsatChat,
      b: b.avgCsatChat,
      format: decimal,
      formatDelta: decimalDelta,
    },
    {
      label: 'Ø CSAT CCT',
      a: a.avgCsatCct,
      b: b.avgCsatCct,
      format: decimal,
      formatDelta: decimalDelta,
    },
  ]
}

export function ComparePage() {
  const { loading, periods, activePeriod } = useReportData()
  const [periodA, setPeriodA] = useState('')
  const [periodB, setPeriodB] = useState('')
  const [recordsA, setRecordsA] = useState<OperatorRecord[] | null>(null)
  const [recordsB, setRecordsB] = useState<OperatorRecord[] | null>(null)

  // Sensible defaults: compare the two newest periods (older → newer).
  useEffect(() => {
    if (periods.length >= 2 && !periodA && !periodB) {
      setPeriodA(periods[1].id)
      setPeriodB(activePeriod ?? periods[0].id)
    }
  }, [periods, activePeriod, periodA, periodB])

  useEffect(() => {
    if (!periodA) return
    let cancelled = false
    db.getRecordsForPeriod(periodA).then((records) => {
      if (!cancelled) setRecordsA(records)
    })
    return () => {
      cancelled = true
    }
  }, [periodA])

  useEffect(() => {
    if (!periodB) return
    let cancelled = false
    db.getRecordsForPeriod(periodB).then((records) => {
      if (!cancelled) setRecordsB(records)
    })
    return () => {
      cancelled = true
    }
  }, [periodB])

  const summaryA = useMemo(
    () => (recordsA ? computeSummary(recordsA) : null),
    [recordsA],
  )
  const summaryB = useMemo(
    () => (recordsB ? computeSummary(recordsB) : null),
    [recordsB],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (periods.length < 2) {
    return (
      <>
        <PageHeader
          title="Porovnání období"
          description="Srovnání dvou importovaných období"
          showPeriod={false}
        />
        <EmptyState
          title="Nedostatek dat pro porovnání"
          description="Pro porovnání jsou potřeba alespoň dvě importovaná období."
        />
      </>
    )
  }

  const rows =
    summaryA && summaryB ? buildRows(summaryA, summaryB) : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Porovnání období"
        description="Změny klíčových metrik mezi dvěma obdobími"
        showPeriod={false}
      />

      <div className="no-print flex flex-wrap items-center gap-3">
        <Select
          className="w-48"
          value={periodA}
          onChange={(e) => setPeriodA(e.target.value)}
          aria-label="Výchozí období"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Select
          className="w-48"
          value={periodB}
          onChange={(e) => setPeriodB(e.target.value)}
          aria-label="Porovnávané období"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {periodA === periodB ? (
        <p className="text-sm text-muted-foreground">
          Vyberte dvě různá období.
        </p>
      ) : !summaryA || !summaryB ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((row) => (
              <Card key={row.label} className="animate-fade-in-up">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{row.label}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {row.format(row.a)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xl font-semibold tabular-nums">
                      {row.format(row.b)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <DeltaBadge
                      delta={
                        row.a !== null && row.b !== null ? row.b - row.a : null
                      }
                      format={row.formatDelta}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-base">Procentní KPI</CardTitle>
                <CardDescription>
                  {periodA} vs. {periodB}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PeriodComparisonChart
                  labelA={periodA}
                  labelB={periodB}
                  scale="percent"
                  data={[
                    {
                      metric: 'Total Performance',
                      a: summaryA.avgTotalPerformance,
                      b: summaryB.avgTotalPerformance,
                    },
                    {
                      metric: 'Productivity',
                      a: summaryA.avgProductivity,
                      b: summaryB.avgProductivity,
                    },
                    {
                      metric: 'Internal Rating',
                      a: summaryA.avgInternalRating,
                      b: summaryB.avgInternalRating,
                    },
                  ]}
                />
              </CardContent>
            </Card>
            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-base">CSAT (škála 1–5)</CardTitle>
                <CardDescription>
                  {periodA} vs. {periodB}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PeriodComparisonChart
                  labelA={periodA}
                  labelB={periodB}
                  scale="csat"
                  data={[
                    {
                      metric: 'CSAT Call',
                      a: summaryA.avgCsatCall,
                      b: summaryB.avgCsatCall,
                    },
                    {
                      metric: 'CSAT Chat',
                      a: summaryA.avgCsatChat,
                      b: summaryB.avgCsatChat,
                    },
                    {
                      metric: 'CSAT CCT',
                      a: summaryA.avgCsatCct,
                      b: summaryB.avgCsatCct,
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
