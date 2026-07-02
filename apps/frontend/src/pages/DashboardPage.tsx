import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Award,
  ArrowDownRight,
  ArrowUpRight,
  FileDown,
  Grid3X3,
  ScatterChart,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportToPdf } from '@/services/exportService'
import { useReportData } from '@/hooks/useReportData'
import { usePreviousPeriod } from '@/hooks/useHistoryData'
import { useSettings } from '@/hooks/useSettings'
import { useWatchlist } from '@/hooks/useWatchlist'
import {
  computeSummary,
  computeTeams,
  rankByTotalPerformance,
} from '@/utils/analytics'
import { formatDecimal, formatInt, formatPercent } from '@/utils/format'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PercentValue, CsatValue } from '@/components/PerformanceValue'
import { OperatorHoverCard } from '@/components/OperatorHoverCard'
import { useOperatorDrawer } from '@/components/OperatorDrawer'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DistributionChart } from '@/components/charts/DistributionChart'
import { CsatAveragesChart } from '@/components/charts/CsatAveragesChart'
import { ManagerComparisonChart } from '@/components/charts/ManagerComparisonChart'
import type { OperatorRecord } from '@/types'

/** Big interactive Mission Control card — click drills into the answer. */
function MissionCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  onClick,
}: {
  label: string
  value: ReactNode
  sub?: string
  icon: typeof Target
  color: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border bg-card/85 p-5 text-left shadow-sm backdrop-blur-sm transition-all animate-fade-in-up hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div
          className="rounded-lg p-2 transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-extrabold leading-tight">{value}</div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      <p
        className="mt-2 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color }}
      >
        Otevřít detail →
      </p>
    </button>
  )
}

function OperatorRankList({ records }: { records: OperatorRecord[] }) {
  const { openOperator } = useOperatorDrawer()
  return (
    <ul className="space-y-2">
      {records.map((record, index) => (
        <li key={record.id}>
          <OperatorHoverCard operator={record} className="w-full">
            <button
              type="button"
              onClick={() => openOperator(record.fullName)}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className="w-5 shrink-0 text-xs text-muted-foreground">
                  {index + 1}.
                </span>
                <span className="truncate font-medium">{record.fullName}</span>
              </span>
              <PercentValue
                value={record.totalPerformance}
                className="text-sm"
              />
            </button>
          </OperatorHoverCard>
        </li>
      ))}
    </ul>
  )
}

export function DashboardPage() {
  const { loading, records, activePeriod } = useReportData()
  const { settings } = useSettings()
  const { previousRecords } = usePreviousPeriod()
  const { watchlist } = useWatchlist()
  const { openOperator: openWatchedOperator } = useOperatorDrawer()
  const navigate = useNavigate()

  const target = settings.thresholds.good
  const summary = useMemo(() => computeSummary(records), [records])
  const teams = useMemo(() => computeTeams(records), [records])
  const ranked = useMemo(() => rankByTotalPerformance(records), [records])

  const mission = useMemo(() => {
    const measured = records.filter((r) => r.totalPerformance !== null)
    const above = measured.filter((r) => r.totalPerformance! >= target)
    const below = measured.filter((r) => r.totalPerformance! < target)

    let bestMove: { manager: string; delta: number } | null = null
    let worstMove: { manager: string; delta: number } | null = null
    if (previousRecords && previousRecords.length > 0) {
      const prevTeams = new Map(
        computeTeams(previousRecords).map((t) => [
          t.manager,
          t.avgTotalPerformance,
        ]),
      )
      for (const team of teams) {
        const before = prevTeams.get(team.manager)
        if (before == null || team.avgTotalPerformance == null) continue
        const delta = team.avgTotalPerformance - before
        if (!bestMove || delta > bestMove.delta)
          bestMove = { manager: team.manager, delta }
        if (!worstMove || delta < worstMove.delta)
          worstMove = { manager: team.manager, delta }
      }
    }

    const percentWeakest = [
      { label: 'Productivity', value: summary.avgProductivity },
      { label: 'Internal Rating', value: summary.avgInternalRating },
    ]
      .filter((m) => m.value !== null)
      .sort((a, b) => a.value! - b.value!)[0]
    const csatWeakest = [
      { label: 'CSAT Call', value: summary.avgCsatCall },
      { label: 'CSAT Chat', value: summary.avgCsatChat },
      { label: 'CSAT CCT', value: summary.avgCsatCct },
    ]
      .filter((m) => m.value !== null)
      .sort((a, b) => a.value! - b.value!)[0]

    return {
      above,
      below,
      measured: measured.length,
      bestMove,
      worstMove,
      percentWeakest,
      csatWeakest,
    }
  }, [records, teams, previousRecords, summary, target])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (!activePeriod || records.length === 0) {
    return (
      <>
        <PageHeader
          title="Mission Control"
          description="Řídicí centrum výkonnosti zákaznického centra"
          showPeriod={false}
        />
        <EmptyState />
      </>
    )
  }

  const bestTeam = teams[0]
  const worstTeam = teams.length > 1 ? teams[teams.length - 1] : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Control"
        description="Nejdůležitější odpovědi na jeden pohled — kliknutím na kartu se dostanete k detailu"
        actions={
          <div className="no-print flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/matrix">
                <ScatterChart className="h-4 w-4" />
                Matrix
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/heatmap">
                <Grid3X3 className="h-4 w-4" />
                Heatmapa
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPdf}>
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
          </div>
        }
      />

      {/* Mission Control cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MissionCard
          label="Operátoři nad cílem"
          value={
            <span className="text-[#2e7d00] dark:text-[#5ed312]">
              {formatInt(mission.above.length)}
              <span className="text-base font-semibold text-muted-foreground">
                {' '}
                / {formatInt(mission.measured)}
              </span>
            </span>
          }
          sub={`cíl ${formatPercent(target)} Total Performance`}
          icon={TrendingUp}
          color="#3fa30a"
          onClick={() => navigate(`/operators?minTp=${target}`)}
        />
        <MissionCard
          label="Operátoři pod cílem"
          value={
            <span className="text-[#b02020] dark:text-[#f07575]">
              {formatInt(mission.below.length)}
              <span className="text-base font-semibold text-muted-foreground">
                {' '}
                / {formatInt(mission.measured)}
              </span>
            </span>
          }
          sub="kandidáti na coaching"
          icon={Target}
          color="#d03b3b"
          onClick={() => navigate(`/operators?maxTp=${target}`)}
        />
        <MissionCard
          label="Nejlepší tým"
          value={bestTeam?.manager ?? '–'}
          sub={
            bestTeam
              ? `Ø ${formatPercent(bestTeam.avgTotalPerformance)} · ${bestTeam.operatorCount} operátorů`
              : undefined
          }
          icon={Award}
          color="#0094e7"
          onClick={() =>
            bestTeam &&
            navigate(`/managers/${encodeURIComponent(bestTeam.manager)}`)
          }
        />
        <MissionCard
          label="Největší zlepšení"
          value={
            mission.bestMove ? (
              <span className="inline-flex items-center gap-1">
                <ArrowUpRight className="h-5 w-5 text-[#2e7d00] dark:text-[#5ed312]" />
                {mission.bestMove.manager}
              </span>
            ) : (
              <span className="text-base font-medium text-muted-foreground">
                Chybí předchozí období
              </span>
            )
          }
          sub={
            mission.bestMove
              ? `+${formatDecimal(mission.bestMove.delta)} p. b. vs. minulé období`
              : 'importujte starší report pro srovnání'
          }
          icon={TrendingUp}
          color="#3fa30a"
          onClick={() =>
            mission.bestMove
              ? navigate(
                  `/managers/${encodeURIComponent(mission.bestMove.manager)}`,
                )
              : navigate('/import')
          }
        />
        <MissionCard
          label="Největší propad"
          value={
            mission.worstMove && mission.worstMove.delta < 0 ? (
              <span className="inline-flex items-center gap-1">
                <ArrowDownRight className="h-5 w-5 text-[#b02020] dark:text-[#f07575]" />
                {mission.worstMove.manager}
              </span>
            ) : (
              <span className="text-base font-medium text-muted-foreground">
                {mission.worstMove ? 'Žádný tým neklesá' : 'Chybí srovnání'}
              </span>
            )
          }
          sub={
            mission.worstMove && mission.worstMove.delta < 0
              ? `${formatDecimal(mission.worstMove.delta)} p. b. vs. minulé období`
              : undefined
          }
          icon={TrendingDown}
          color="#ec835a"
          onClick={() =>
            mission.worstMove
              ? navigate(
                  `/managers/${encodeURIComponent(mission.worstMove.manager)}`,
                )
              : navigate('/import')
          }
        />
        <MissionCard
          label="Největší rezerva"
          value={mission.csatWeakest?.label ?? mission.percentWeakest?.label ?? '–'}
          sub={
            mission.csatWeakest
              ? `průměr ${formatDecimal(mission.csatWeakest.value)} z 5 — nejslabší kanál`
              : undefined
          }
          icon={AlertTriangle}
          color="#8a6a00"
          onClick={() => navigate('/summary')}
        />
      </div>

      {/* Compact averages strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-card/85 px-4 py-3 text-sm backdrop-blur-sm animate-fade-in-up">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Průměry období
        </span>
        {[
          {
            label: 'Total Performance',
            node: <PercentValue value={summary.avgTotalPerformance} />,
          },
          {
            label: 'Productivity',
            node: <PercentValue value={summary.avgProductivity} />,
          },
          {
            label: 'Internal Rating',
            node: <PercentValue value={summary.avgInternalRating} />,
          },
          {
            label: 'CSAT Call',
            node: <CsatValue value={summary.avgCsatCall} />,
          },
          {
            label: 'CSAT Chat',
            node: <CsatValue value={summary.avgCsatChat} />,
          },
          { label: 'CSAT CCT', node: <CsatValue value={summary.avgCsatCct} /> },
        ].map((item) => (
          <span key={item.label} className="inline-flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">{item.label}</span>
            {item.node}
          </span>
        ))}
        <Link
          to="/summary"
          className="no-print ml-auto text-xs font-semibold text-[#2e7d00] hover:underline dark:text-[#5ed312]"
        >
          Otevřít měsíční souhrn →
        </Link>
      </div>

      {/* Coaching watchlist */}
      {watchlist.length > 0 && (
        <Card className="animate-fade-in-up border-[#eda100]/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 fill-[#eda100] text-[#eda100]" />
              Sledovaní operátoři
            </CardTitle>
            <CardDescription>
              Váš coaching watchlist ({watchlist.length}) · hvězdičku přidáte
              v detailu, panelu nebo pravým klikem v tabulce
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {watchlist.map((name) => {
                const record = records.find((r) => r.fullName === name)
                if (!record) {
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground"
                    >
                      <span className="truncate">{name}</span>
                      <span className="text-xs">není v tomto období</span>
                    </div>
                  )
                }
                return (
                  <OperatorHoverCard key={name} operator={record}>
                    <button
                      type="button"
                      onClick={() => openWatchedOperator(record.fullName)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {record.fullName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {record.manager}
                        </span>
                      </span>
                      <PercentValue
                        value={record.totalPerformance}
                        className="shrink-0"
                      />
                    </button>
                  </OperatorHoverCard>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top / bottom + teams */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">TOP 5 operátorů</CardTitle>
            <CardDescription>
              Podle Total Performance · klik = rychlý náhled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OperatorRankList records={ranked.slice(0, 5)} />
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bottom 5 operátorů</CardTitle>
            <CardDescription>
              Podle Total Performance · klik = rychlý náhled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OperatorRankList records={ranked.slice(-5).reverse()} />
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nejsilnější tým</CardTitle>
            <CardDescription>Podle Ø Total Performance</CardDescription>
          </CardHeader>
          <CardContent>
            {bestTeam ? (
              <Link
                to={`/managers/${encodeURIComponent(bestTeam.manager)}`}
                className="block rounded-md p-2 transition-colors hover:bg-muted"
              >
                <p className="font-semibold">{bestTeam.manager}</p>
                <p className="text-sm text-muted-foreground">
                  {bestTeam.operatorCount} operátorů
                </p>
                <p className="mt-2 text-2xl font-bold">
                  <PercentValue value={bestTeam.avgTotalPerformance} />
                </p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Žádná data</p>
            )}
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nejslabší tým</CardTitle>
            <CardDescription>Podle Ø Total Performance</CardDescription>
          </CardHeader>
          <CardContent>
            {worstTeam ? (
              <Link
                to={`/managers/${encodeURIComponent(worstTeam.manager)}`}
                className="block rounded-md p-2 transition-colors hover:bg-muted"
              >
                <p className="font-semibold">{worstTeam.manager}</p>
                <p className="text-sm text-muted-foreground">
                  {worstTeam.operatorCount} operátorů
                </p>
                <p className="mt-2 text-2xl font-bold">
                  <PercentValue value={worstTeam.avgTotalPerformance} />
                </p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pouze jeden tým v datech
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distributions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base">
              Rozložení Total Performance
            </CardTitle>
            <CardDescription>
              Počet operátorů v pásmech po 5 p. b.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionChart
              values={records.map((r) => r.totalPerformance)}
            />
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base">Rozložení Productivity</CardTitle>
            <CardDescription>
              Počet operátorů v pásmech po 5 p. b.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionChart values={records.map((r) => r.productivity)} />
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base">
              Rozložení Internal Rating
            </CardTitle>
            <CardDescription>
              Počet operátorů v pásmech po 5 p. b.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionChart values={records.map((r) => r.internalRating)} />
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base">Průměrné CSAT</CardTitle>
            <CardDescription>Průměr hodnocení podle kanálu</CardDescription>
          </CardHeader>
          <CardContent>
            <CsatAveragesChart
              call={summary.avgCsatCall}
              chat={summary.avgCsatChat}
              cct={summary.avgCsatCct}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="text-base">Porovnání manažerů</CardTitle>
          <CardDescription>
            Ø Total Performance týmů, čárkovaná linka = cíl 100 %
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManagerComparisonChart teams={teams} />
        </CardContent>
      </Card>
    </div>
  )
}
