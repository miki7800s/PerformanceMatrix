import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  FileDown,
  Gauge,
  LineChart,
  LayoutGrid,
  MessageSquare,
  Phone,
  Star,
  TicketCheck,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { useReportData } from '@/hooks/useReportData'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useOperatorHistory } from '@/hooks/useHistoryData'
import { useSettings } from '@/hooks/useSettings'
import { average, averageOf } from '@/utils/analytics'
import {
  formatDecimal,
  formatInt,
  formatPercent,
  getPerformanceTone,
} from '@/utils/format'
import { exportToPdf } from '@/services/exportService'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { KpiCard } from '@/components/KpiCard'
import {
  KpiDetailDialog,
  type KpiDetailTarget,
} from '@/components/KpiDetailDialog'
import { CsatValue, PercentValue } from '@/components/PerformanceValue'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProgressRing } from '@/components/ProgressRing'
import { KpiRadarChart } from '@/components/charts/KpiRadarChart'
import { KpiBarChart } from '@/components/charts/KpiBarChart'
import { TrendChart, type TrendPoint } from '@/components/charts/TrendChart'
import { useTheme } from '@/hooks/useTheme'
import { getVizColors, toneColor } from '@/components/charts/chartTheme'

interface ProgressRowProps {
  label: string
  value: number | null
  max: number
}

function ProgressRow({ label, value, max }: ProgressRowProps) {
  const { theme } = useTheme()
  const { settings } = useSettings()
  const colors = getVizColors(theme)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <PercentValue value={value} />
      </div>
      <Progress
        value={value}
        max={max}
        indicatorColor={toneColor(
          getPerformanceTone(value, settings.thresholds),
          colors,
        )}
      />
    </div>
  )
}

export function OperatorDetailPage() {
  const { name } = useParams<{ name: string }>()
  const { loading, records, activePeriod } = useReportData()
  const fullName = name ? decodeURIComponent(name) : ''
  const history = useOperatorHistory(fullName || null)
  const { isWatched, toggleWatch } = useWatchlist()
  const [kpiTarget, setKpiTarget] = useState<KpiDetailTarget | null>(null)

  const operator = useMemo(
    () => records.find((r) => r.fullName === fullName) ?? null,
    [records, fullName],
  )

  const teamAverages = useMemo(() => {
    if (!operator) return null
    const team = records.filter((r) => r.manager === operator.manager)
    return {
      attendance: averageOf(team, 'attendance'),
      productivity: averageOf(team, 'productivity'),
      productivityPerformance: averageOf(team, 'productivityPerformance'),
      internalRating: averageOf(team, 'internalRating'),
      totalPerformance: averageOf(team, 'totalPerformance'),
    }
  }, [records, operator])

  const trendPoints = useMemo<TrendPoint[]>(
    () =>
      history.records.map((r) => ({
        period: r.period,
        totalPerformance: r.totalPerformance,
        productivity: r.productivity,
        internalRating: r.internalRating,
        csatCall: r.csatCallAverage,
        csatChat: r.csatChatAverage,
        csatCct: r.csatCctAverage,
      })),
    [history.records],
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

  if (!operator) {
    return (
      <>
        <PageHeader title="Detail operátora" showPeriod={false} />
        <EmptyState
          title="Operátor nenalezen"
          description={`Operátor „${fullName}" není v aktivním období ${
            activePeriod ?? ''
          }. Zkuste změnit období nebo importovat report.`}
        />
      </>
    )
  }

  const progressMax = Math.max(
    120,
    ...[
      operator.attendance,
      operator.productivity,
      operator.productivityPerformance,
      operator.internalRating,
      operator.totalPerformance,
    ].filter((v): v is number => v !== null),
  )

  const radarData = [
    {
      metric: 'Attendance',
      value: operator.attendance,
      reference: teamAverages?.attendance,
    },
    {
      metric: 'Productivity',
      value: operator.productivity,
      reference: teamAverages?.productivity,
    },
    {
      metric: 'Productivity Perf.',
      value: operator.productivityPerformance,
      reference: teamAverages?.productivityPerformance,
    },
    {
      metric: 'Internal Rating',
      value: operator.internalRating,
      reference: teamAverages?.internalRating,
    },
    {
      metric: 'Total Performance',
      value: operator.totalPerformance,
      reference: teamAverages?.totalPerformance,
    },
  ]

  const csatPerformanceData = [
    { metric: 'CSAT Call Perf.', value: operator.csatCallPerformance },
    { metric: 'CSAT Chat Perf.', value: operator.csatChatPerformance },
    { metric: 'CSAT CCT Perf.', value: operator.csatCctPerformance },
  ]

  const openKpi = (target: KpiDetailTarget) => setKpiTarget(target)

  return (
    <div className="space-y-6">
      <div>
        <div className="no-print mb-3 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/operators">
              <ArrowLeft className="h-4 w-4" />
              Zpět na operátory
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleWatch(operator.fullName)}
            >
              <Star
                className={
                  isWatched(operator.fullName)
                    ? 'h-4 w-4 fill-[#eda100] text-[#eda100]'
                    : 'h-4 w-4'
                }
              />
              {isWatched(operator.fullName) ? 'Sledováno' : 'Sledovat'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPdf}>
              <FileDown className="h-4 w-4" />
              Exportovat PDF
            </Button>
          </div>
        </div>
        <PageHeader
          title={operator.fullName}
          description={
            <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                Manager:{' '}
                <Link
                  to={`/managers/${encodeURIComponent(operator.manager)}`}
                  className="font-medium text-[#2e7d00] hover:underline dark:text-[#5ed312]"
                >
                  {operator.manager}
                </Link>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Období: {operator.period}
              </span>
            </span>
          }
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="no-print">
          <TabsTrigger value="overview">
            <LayoutGrid className="h-3.5 w-3.5" />
            Přehled
          </TabsTrigger>
          <TabsTrigger value="trend">
            <LineChart className="h-3.5 w-3.5" />
            Trend
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="animate-fade-in-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance DNA</CardTitle>
              <CardDescription>
                Výkonový profil na jeden pohled — prstenec se plní k cíli,
                hodnoty nad 100 % září. Kliknutím na KPI kartu níže otevřete
                detail s pořadím a percentilem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <ProgressRing
                  label="Total Perf."
                  value={operator.totalPerformance}
                />
                <ProgressRing
                  label="Productivity"
                  value={operator.productivity}
                />
                <ProgressRing
                  label="Product. Perf."
                  value={operator.productivityPerformance}
                />
                <ProgressRing
                  label="Internal Rating"
                  value={operator.internalRating}
                />
                <ProgressRing label="Attendance" value={operator.attendance} />
                <ProgressRing
                  label="CSAT Call Perf."
                  value={operator.csatCallPerformance}
                />
                <ProgressRing
                  label="CSAT Chat Perf."
                  value={operator.csatChatPerformance}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total Performance"
          accent="green"
              value={formatPercent(operator.totalPerformance)}
              icon={TrendingUp}
              subtitle="Hlavní KPI · klik = detail"
              onClick={() =>
                openKpi({
                  metricKey: 'totalPerformance',
                  label: 'Total Performance',
                  kind: 'percent',
                })
              }
            />
            <KpiCard
              title="Productivity"
          accent="azure"
              value={formatPercent(operator.productivity)}
              icon={Gauge}
              subtitle="klik = detail"
              onClick={() =>
                openKpi({
                  metricKey: 'productivity',
                  label: 'Productivity',
                  kind: 'percent',
                })
              }
            />
            <KpiCard
              title="Internal Rating"
          accent="navy"
              value={formatPercent(operator.internalRating)}
              icon={Star}
              subtitle="klik = detail"
              onClick={() =>
                openKpi({
                  metricKey: 'internalRating',
                  label: 'Internal Rating',
                  kind: 'percent',
                })
              }
            />
            <KpiCard
              title="Attendance"
          accent="slate"
              value={formatPercent(operator.attendance)}
              icon={CalendarDays}
              subtitle="klik = detail"
              onClick={() =>
                openKpi({
                  metricKey: 'attendance',
                  label: 'Attendance',
                  kind: 'percent',
                })
              }
            />
            <KpiCard
              title="CSAT Call"
          accent="green"
              value={formatDecimal(operator.csatCallAverage)}
              icon={Phone}
              subtitle={`${formatInt(operator.csatCallCount)} hodnocení · klik = detail`}
              onClick={() =>
                openKpi({
                  metricKey: 'csatCallAverage',
                  label: 'CSAT Call (průměr 1–5)',
                  kind: 'csat',
                })
              }
            />
            <KpiCard
              title="CSAT Chat"
          accent="azure"
              value={formatDecimal(operator.csatChatAverage)}
              icon={MessageSquare}
              subtitle={`${formatInt(operator.csatChatCount)} hodnocení · klik = detail`}
              onClick={() =>
                openKpi({
                  metricKey: 'csatChatAverage',
                  label: 'CSAT Chat (průměr 1–5)',
                  kind: 'csat',
                })
              }
            />
            <KpiCard
              title="CSAT CCT"
          accent="purple"
              value={formatDecimal(operator.csatCctAverage)}
              icon={TicketCheck}
              subtitle={`${formatInt(operator.csatCctCount)} hodnocení · klik = detail`}
              onClick={() =>
                openKpi({
                  metricKey: 'csatCctAverage',
                  label: 'CSAT CCT (průměr 1–5)',
                  kind: 'csat',
                })
              }
            />
            <KpiCard
              title="Productivity Performance"
          accent="purple"
              value={formatPercent(operator.productivityPerformance)}
              icon={Gauge}
              subtitle="klik = detail"
              onClick={() =>
                openKpi({
                  metricKey: 'productivityPerformance',
                  label: 'Productivity Performance',
                  kind: 'percent',
                })
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-base">KPI vs. průměr týmu</CardTitle>
                <CardDescription>
                  Plná plocha = operátor, šedá = průměr týmu {operator.manager}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KpiRadarChart
                  data={radarData}
                  seriesName={operator.fullName}
                  referenceName="Průměr týmu"
                />
              </CardContent>
            </Card>

            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-base">Plnění KPI</CardTitle>
                <CardDescription>
                  Měřítko se přizpůsobuje datům – 100 % není strop
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProgressRow
                  label="Total Performance"
                  value={operator.totalPerformance}
                  max={progressMax}
                />
                <ProgressRow
                  label="Productivity"
                  value={operator.productivity}
                  max={progressMax}
                />
                <ProgressRow
                  label="Productivity Performance"
                  value={operator.productivityPerformance}
                  max={progressMax}
                />
                <ProgressRow
                  label="Internal Rating"
                  value={operator.internalRating}
                  max={progressMax}
                />
                <ProgressRow
                  label="Attendance"
                  value={operator.attendance}
                  max={progressMax}
                />
              </CardContent>
            </Card>

            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-base">CSAT Performance</CardTitle>
                <CardDescription>
                  Výkon podle kanálu vůči cíli 100 %
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KpiBarChart data={csatPerformanceData} />
              </CardContent>
            </Card>

            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-base">CSAT detail</CardTitle>
                <CardDescription>
                  Průměr hodnocení (1–5) a počet hodnocení podle kanálu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {[
                    {
                      label: 'CSAT Call',
                      average: operator.csatCallAverage,
                      count: operator.csatCallCount,
                    },
                    {
                      label: 'CSAT Chat',
                      average: operator.csatChatAverage,
                      count: operator.csatChatCount,
                    },
                    {
                      label: 'CSAT CCT',
                      average: operator.csatCctAverage,
                      count: operator.csatCctCount,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-3"
                    >
                      <span className="text-sm text-muted-foreground">
                        {row.label}
                      </span>
                      <span className="flex items-baseline gap-3">
                        <CsatValue value={row.average} className="text-lg" />
                        <span className="text-xs text-muted-foreground">
                          {formatInt(row.count)} hodnocení
                        </span>
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">
                      Ø CSAT celkem
                    </span>
                    <span className="text-lg font-semibold tabular-nums">
                      {formatDecimal(
                        average([
                          operator.csatCallAverage,
                          operator.csatChatAverage,
                          operator.csatCctAverage,
                        ]),
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trend" className="space-y-4">
          {history.loading ? (
            <Skeleton className="h-80 w-full" />
          ) : history.records.length < 2 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
              Pro tohoto operátora zatím není dostupná historie.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="animate-fade-in-up lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Vývoj procentních KPI
                  </CardTitle>
                  <CardDescription>
                    Total Performance, Productivity a Internal Rating napříč
                    obdobími ({history.records.length} období)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TrendChart
                    data={trendPoints}
                    scale="percent"
                    series={[
                      {
                        key: 'totalPerformance',
                        name: 'Total Performance',
                        slot: 0,
                      },
                      { key: 'productivity', name: 'Productivity', slot: 1 },
                      {
                        key: 'internalRating',
                        name: 'Internal Rating',
                        slot: 4,
                      },
                    ]}
                  />
                </CardContent>
              </Card>
              <Card className="animate-fade-in-up lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Vývoj CSAT</CardTitle>
                  <CardDescription>
                    Průměrné hodnocení podle kanálu (škála 1–5)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TrendChart
                    data={trendPoints}
                    scale="csat"
                    series={[
                      { key: 'csatCall', name: 'CSAT Call', slot: 0 },
                      { key: 'csatChat', name: 'CSAT Chat', slot: 1 },
                      { key: 'csatCct', name: 'CSAT CCT', slot: 2 },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <KpiDetailDialog
        target={kpiTarget}
        onClose={() => setKpiTarget(null)}
        operator={operator}
        companyRecords={records}
      />
    </div>
  )
}
