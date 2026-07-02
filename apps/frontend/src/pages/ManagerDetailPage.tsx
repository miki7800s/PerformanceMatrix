import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  FileDown,
  Gauge,
  Headset,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useReportData } from '@/hooks/useReportData'
import { useManagerHistory } from '@/hooks/useHistoryData'
import {
  average,
  averageOf,
  computeStats,
  computeTeams,
} from '@/utils/analytics'
import { formatDecimal, formatPercent } from '@/utils/format'
import { exportToPdf } from '@/services/exportService'
import { TrendChart, type TrendPoint } from '@/components/charts/TrendChart'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { KpiCard } from '@/components/KpiCard'
import { CsatValue, PercentValue } from '@/components/PerformanceValue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { KpiRadarChart } from '@/components/charts/KpiRadarChart'
import { KpiBarChart } from '@/components/charts/KpiBarChart'
import { DistributionChart } from '@/components/charts/DistributionChart'

export function ManagerDetailPage() {
  const { name } = useParams<{ name: string }>()
  const { loading, records, activePeriod } = useReportData()
  const navigate = useNavigate()
  const manager = name ? decodeURIComponent(name) : ''

  const team = useMemo(
    () => computeTeams(records).find((t) => t.manager === manager) ?? null,
    [records, manager],
  )
  const members = useMemo(
    () =>
      records
        .filter((r) => r.manager === manager)
        .sort(
          (a, b) =>
            (b.totalPerformance ?? -Infinity) -
            (a.totalPerformance ?? -Infinity),
        ),
    [records, manager],
  )

  const history = useManagerHistory(manager || null)

  /** Team averages per period, for the trend charts. */
  const teamTrend = useMemo<TrendPoint[]>(() => {
    const byPeriod = new Map<string, typeof history.records>()
    for (const record of history.records) {
      const list = byPeriod.get(record.period) ?? []
      list.push(record)
      byPeriod.set(record.period, list)
    }
    return [...byPeriod.entries()].map(([period, rows]) => ({
      period,
      totalPerformance: average(rows.map((r) => r.totalPerformance)),
      productivity: average(rows.map((r) => r.productivity)),
      csatCall: average(rows.map((r) => r.csatCallAverage)),
      csatChat: average(rows.map((r) => r.csatChatAverage)),
      csatCct: average(rows.map((r) => r.csatCctAverage)),
      memberCount: rows.length,
    }))
  }, [history.records])

  const performanceStats = useMemo(
    () => computeStats(members.map((m) => m.totalPerformance)),
    [members],
  )

  const companyAverages = useMemo(
    () => ({
      attendance: averageOf(records, 'attendance'),
      productivity: averageOf(records, 'productivity'),
      productivityPerformance: averageOf(records, 'productivityPerformance'),
      internalRating: averageOf(records, 'internalRating'),
      totalPerformance: averageOf(records, 'totalPerformance'),
    }),
    [records],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!team) {
    return (
      <>
        <PageHeader title="Detail manažera" showPeriod={false} />
        <EmptyState
          title="Manažer nenalezen"
          description={`Manažer „${manager}" není v aktivním období ${
            activePeriod ?? ''
          }.`}
        />
      </>
    )
  }

  const teamAverages = {
    attendance: averageOf(members, 'attendance'),
    productivity: averageOf(members, 'productivity'),
    productivityPerformance: averageOf(members, 'productivityPerformance'),
  }

  const radarData = [
    {
      metric: 'Attendance',
      value: teamAverages.attendance,
      reference: companyAverages.attendance,
    },
    {
      metric: 'Productivity',
      value: team.avgProductivity,
      reference: companyAverages.productivity,
    },
    {
      metric: 'Productivity Perf.',
      value: teamAverages.productivityPerformance,
      reference: companyAverages.productivityPerformance,
    },
    {
      metric: 'Internal Rating',
      value: team.avgInternalRating,
      reference: companyAverages.internalRating,
    },
    {
      metric: 'Total Performance',
      value: team.avgTotalPerformance,
      reference: companyAverages.totalPerformance,
    },
  ]

  const kpiBarData = [
    { metric: 'Total Performance', value: team.avgTotalPerformance },
    { metric: 'Productivity', value: team.avgProductivity },
    { metric: 'Internal Rating', value: team.avgInternalRating },
    { metric: 'Attendance', value: teamAverages.attendance },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="no-print mb-3 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/managers">
              <ArrowLeft className="h-4 w-4" />
              Zpět na manažery
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPdf}>
            <FileDown className="h-4 w-4" />
            Exportovat PDF
          </Button>
        </div>
        <PageHeader
          title={manager}
          description={`Tým s ${team.operatorCount} operátory`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Počet operátorů"
          accent="slate"
          value={String(team.operatorCount)}
          icon={Headset}
        />
        <KpiCard
          title="Ø Total Performance"
          accent="green"
          value={formatPercent(team.avgTotalPerformance)}
          icon={TrendingUp}
        />
        <KpiCard
          title="Ø Productivity"
          accent="azure"
          value={formatPercent(team.avgProductivity)}
          icon={Gauge}
        />
        <KpiCard
          title="Ø Internal Rating"
          accent="navy"
          value={formatPercent(team.avgInternalRating)}
          icon={Star}
        />
        <KpiCard
          title="Ø CSAT Call"
          accent="green"
          value={formatDecimal(team.avgCsatCall)}
          icon={Star}
          subtitle="Škála 1–5"
        />
        <KpiCard
          title="Ø CSAT Chat"
          accent="azure"
          value={formatDecimal(team.avgCsatChat)}
          icon={Star}
          subtitle="Škála 1–5"
        />
        <KpiCard
          title="Nejlepší operátor"
          accent="green"
          value={team.best?.fullName ?? '–'}
          icon={Award}
          subtitle={
            team.best ? formatPercent(team.best.totalPerformance) : undefined
          }
          valueClassName="text-lg"
        />
        <KpiCard
          title="Nejslabší operátor"
          accent="slate"
          value={team.worst?.fullName ?? '–'}
          icon={TrendingDown}
          subtitle={
            team.worst ? formatPercent(team.worst.totalPerformance) : undefined
          }
          valueClassName="text-lg"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base">Tým vs. celek</CardTitle>
            <CardDescription>
              Plná plocha = tým, šedá = průměr všech operátorů
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KpiRadarChart
              data={radarData}
              seriesName={`Tým ${manager}`}
              referenceName="Průměr celku"
            />
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base">Průměrné KPI týmu</CardTitle>
            <CardDescription>Vůči cíli 100 %</CardDescription>
          </CardHeader>
          <CardContent>
            <KpiBarChart data={kpiBarData} />
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="text-base">
            Statistiky výkonu týmu (Total Performance)
          </CardTitle>
          <CardDescription>
            Popisná statistika napříč {performanceStats.count} operátory
            s hodnotou
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              {
                label: 'Medián',
                value: formatPercent(performanceStats.median),
              },
              {
                label: 'Minimum',
                value: formatPercent(performanceStats.min),
              },
              {
                label: 'Maximum',
                value: formatPercent(performanceStats.max),
              },
              {
                label: 'Směrodatná odchylka',
                value:
                  performanceStats.stdDev !== null
                    ? `${formatDecimal(performanceStats.stdDev)} p. b.`
                    : '–',
              },
              {
                label: 'Rozptyl',
                value:
                  performanceStats.variance !== null
                    ? formatDecimal(performanceStats.variance)
                    : '–',
              },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="text-base">
            Rozložení Total Performance v týmu
          </CardTitle>
          <CardDescription>Počet operátorů v pásmech po 5 p. b.</CardDescription>
        </CardHeader>
        <CardContent>
          <DistributionChart values={members.map((r) => r.totalPerformance)} />
        </CardContent>
      </Card>

      {teamTrend.length >= 2 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-base">Trend výkonu týmu</CardTitle>
              <CardDescription>
                Ø Total Performance a Ø Productivity napříč obdobími
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={teamTrend}
                scale="percent"
                series={[
                  {
                    key: 'totalPerformance',
                    name: 'Ø Total Performance',
                    slot: 0,
                  },
                  { key: 'productivity', name: 'Ø Productivity', slot: 1 },
                ]}
              />
            </CardContent>
          </Card>
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-base">Trend CSAT týmu</CardTitle>
              <CardDescription>
                Průměrné hodnocení podle kanálu (škála 1–5)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={teamTrend}
                scale="csat"
                series={[
                  { key: 'csatCall', name: 'CSAT Call', slot: 0 },
                  { key: 'csatChat', name: 'CSAT Chat', slot: 1 },
                  { key: 'csatCct', name: 'CSAT CCT', slot: 2 },
                ]}
              />
            </CardContent>
          </Card>
          <Card className="animate-fade-in-up lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Vývoj počtu členů týmu
              </CardTitle>
              <CardDescription>Počet operátorů v jednotlivých obdobích</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={teamTrend}
                scale="count"
                height={200}
                series={[{ key: 'memberCount', name: 'Počet členů', slot: 4 }]}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="text-base">Členové týmu</CardTitle>
          <CardDescription>
            Seřazeno podle Total Performance, kliknutím otevřete detail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jméno</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Productivity</TableHead>
                <TableHead>Internal Rating</TableHead>
                <TableHead>CSAT Call</TableHead>
                <TableHead>CSAT Chat</TableHead>
                <TableHead>CSAT CCT</TableHead>
                <TableHead>Total Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow
                  key={member.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate(
                      `/operators/${encodeURIComponent(member.fullName)}`,
                    )
                  }
                >
                  <TableCell className="font-medium">
                    {member.fullName}
                  </TableCell>
                  <TableCell>
                    <PercentValue value={member.attendance} />
                  </TableCell>
                  <TableCell>
                    <PercentValue value={member.productivity} />
                  </TableCell>
                  <TableCell>
                    <PercentValue value={member.internalRating} />
                  </TableCell>
                  <TableCell>
                    <CsatValue value={member.csatCallAverage} />
                  </TableCell>
                  <TableCell>
                    <CsatValue value={member.csatChatAverage} />
                  </TableCell>
                  <TableCell>
                    <CsatValue value={member.csatCctAverage} />
                  </TableCell>
                  <TableCell>
                    <PercentValue
                      value={member.totalPerformance}
                      className="font-semibold"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
