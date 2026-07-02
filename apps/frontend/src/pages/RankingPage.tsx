import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, TrendingDown } from 'lucide-react'
import type { OperatorMetricKey, OperatorRecord } from '@/types'
import { useReportData } from '@/hooks/useReportData'
import { formatDecimal, formatPercent } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { CsatValue, PercentValue } from '@/components/PerformanceValue'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface RankingMetric {
  key: OperatorMetricKey
  label: string
  kind: 'percent' | 'csat'
}

const METRICS: RankingMetric[] = [
  { key: 'totalPerformance', label: 'Total Performance', kind: 'percent' },
  { key: 'productivity', label: 'Productivity', kind: 'percent' },
  { key: 'internalRating', label: 'Internal Rating', kind: 'percent' },
  { key: 'csatCallAverage', label: 'CSAT Call', kind: 'csat' },
  { key: 'csatChatAverage', label: 'CSAT Chat', kind: 'csat' },
  { key: 'csatCctAverage', label: 'CSAT CCT', kind: 'csat' },
]

const COUNT_OPTIONS = [3, 5, 10, 20]

function RankList({
  records,
  metric,
}: {
  records: OperatorRecord[]
  metric: RankingMetric
}) {
  if (records.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Žádná data pro tuto metriku.
      </p>
    )
  }
  return (
    <ol className="space-y-1">
      {records.map((record, index) => (
        <li key={record.id}>
          <Link
            to={`/operators/${encodeURIComponent(record.fullName)}`}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-6 shrink-0 text-xs text-muted-foreground">
                {index + 1}.
              </span>
              <span className="truncate font-medium">{record.fullName}</span>
            </span>
            {metric.kind === 'percent' ? (
              <PercentValue value={record[metric.key]} />
            ) : (
              <CsatValue value={record[metric.key]} />
            )}
          </Link>
        </li>
      ))}
    </ol>
  )
}

export function RankingPage() {
  const { loading, records, activePeriod } = useReportData()
  const [count, setCount] = useState(5)

  const rankings = useMemo(() => {
    return METRICS.map((metric) => {
      const valid = records
        .filter((r) => r[metric.key] !== null)
        .sort(
          (a, b) => (b[metric.key] as number) - (a[metric.key] as number),
        )
      return {
        metric,
        top: valid.slice(0, count),
        bottom: valid.slice(-count).reverse(),
        average:
          valid.length > 0
            ? valid.reduce((sum, r) => sum + (r[metric.key] as number), 0) /
              valid.length
            : null,
      }
    })
  }, [records, count])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    )
  }

  if (!activePeriod || records.length === 0) {
    return (
      <>
        <PageHeader
          title="Ranking"
          description="Žebříčky operátorů podle metrik"
          showPeriod={false}
        />
        <EmptyState />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ranking"
        description="TOP a BOTTOM operátoři podle jednotlivých metrik"
        actions={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Počet výsledků
            <Select
              className="w-20"
              value={String(count)}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {COUNT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </label>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {rankings.map(({ metric, top, bottom, average }) => (
          <Card key={metric.key} className="animate-fade-in-up">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{metric.label}</CardTitle>
              <CardDescription>
                Ø{' '}
                {metric.kind === 'percent'
                  ? formatPercent(average)
                  : formatDecimal(average)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5" />
                  TOP {count}
                </p>
                <RankList records={top} metric={metric} />
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <TrendingDown className="h-3.5 w-3.5" />
                  BOTTOM {count}
                </p>
                <RankList records={bottom} metric={metric} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
