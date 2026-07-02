import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react'
import type { OperatorRecord } from '@/types'
import { useReportData } from '@/hooks/useReportData'
import { usePreviousPeriod } from '@/hooks/useHistoryData'
import { useSettings } from '@/hooks/useSettings'
import {
  computeSummary,
  computeTeams,
  rankByTotalPerformance,
} from '@/utils/analytics'
import { formatDecimal, formatInt, formatPercent } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { useOperatorDrawer } from '@/components/OperatorDrawer'
import { DeltaBadge } from '@/components/DeltaBadge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Highlighted value inside the narrative. */
function Em({ children }: { children: ReactNode }) {
  return (
    <strong className="rounded-md bg-accent px-1.5 py-0.5 font-semibold text-accent-foreground">
      {children}
    </strong>
  )
}

export function SummaryPage() {
  const { loading, records, activePeriod } = useReportData()
  const { settings } = useSettings()
  const { openOperator } = useOperatorDrawer()

  const { previousId, previousRecords: previous } = usePreviousPeriod()

  const story = useMemo(() => {
    if (records.length === 0) return null
    const target = settings.thresholds.good
    const current = computeSummary(records)
    const teams = computeTeams(records)
    const ranked = rankByTotalPerformance(records)
    const aboveTarget = records.filter(
      (r) => r.totalPerformance !== null && r.totalPerformance >= target,
    ).length
    const measured = records.filter((r) => r.totalPerformance !== null).length

    // Weakest percent metric relative to target.
    const percentMetrics = [
      { label: 'Productivity', value: current.avgProductivity },
      { label: 'Internal Rating', value: current.avgInternalRating },
      { label: 'Total Performance', value: current.avgTotalPerformance },
    ].filter((m) => m.value !== null)
    const weakestPercent = [...percentMetrics].sort(
      (a, b) => a.value! - b.value!,
    )[0]

    const csatChannels = [
      { label: 'CSAT Call', value: current.avgCsatCall },
      { label: 'CSAT Chat', value: current.avgCsatChat },
      { label: 'CSAT CCT', value: current.avgCsatCct },
    ].filter((m) => m.value !== null)
    const weakestCsat = [...csatChannels].sort((a, b) => a.value! - b.value!)[0]

    // Period-over-period team movement.
    let bestMove: { manager: string; delta: number } | null = null
    let worstMove: { manager: string; delta: number } | null = null
    let tpDelta: number | null = null
    let prodDelta: number | null = null
    if (previous && previous.length > 0) {
      const prevSummary = computeSummary(previous)
      tpDelta =
        current.avgTotalPerformance !== null &&
        prevSummary.avgTotalPerformance !== null
          ? current.avgTotalPerformance - prevSummary.avgTotalPerformance
          : null
      prodDelta =
        current.avgProductivity !== null &&
        prevSummary.avgProductivity !== null
          ? current.avgProductivity - prevSummary.avgProductivity
          : null
      const prevTeams = new Map(
        computeTeams(previous).map((t) => [t.manager, t.avgTotalPerformance]),
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

    const goalMet =
      current.avgTotalPerformance !== null &&
      current.avgTotalPerformance >= target

    return {
      current,
      teams,
      ranked,
      aboveTarget,
      measured,
      weakestPercent,
      weakestCsat,
      bestMove,
      worstMove,
      tpDelta,
      prodDelta,
      goalMet,
      target,
    }
  }, [records, previous, settings.thresholds.good])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!story || !activePeriod) {
    return (
      <>
        <PageHeader
          title="Měsíční souhrn"
          description="Automatický manažerský přehled"
          showPeriod={false}
        />
        <EmptyState />
      </>
    )
  }

  const s = story
  const topMovers =
    previous && previous.length > 0
      ? records
          .map((r) => {
            const before = previous.find((p) => p.fullName === r.fullName)
            if (
              !before ||
              before.totalPerformance === null ||
              r.totalPerformance === null
            )
              return null
            return {
              record: r,
              delta: r.totalPerformance - before.totalPerformance,
            }
          })
          .filter((m): m is { record: OperatorRecord; delta: number } => !!m)
          .sort((a, b) => b.delta - a.delta)
      : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Měsíční souhrn"
        description={`Automaticky vygenerovaný manažerský přehled za období ${activePeriod}`}
      />

      {/* Narrative */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-[#5ED312]" />
            Co se v tomto období stalo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[15px] leading-relaxed">
          <p>
            Ve zvoleném období pracovalo{' '}
            <Em>{formatInt(s.current.operatorCount)} operátorů</Em> v{' '}
            <Em>{formatInt(s.current.managerCount)} týmech</Em>. Cíl{' '}
            {formatPercent(s.target)} Total Performance splnilo{' '}
            <Em>
              {formatInt(s.aboveTarget)} z {formatInt(s.measured)}
            </Em>{' '}
            hodnocených operátorů (
            {s.measured > 0
              ? formatPercent((s.aboveTarget / s.measured) * 100)
              : '–'}
            ).
          </p>

          {s.tpDelta !== null ? (
            <p>
              Průměrná Total Performance{' '}
              {s.tpDelta >= 0.05 ? (
                <>
                  <Em>vzrostla o {formatDecimal(s.tpDelta)} p. b.</Em> na{' '}
                </>
              ) : s.tpDelta <= -0.05 ? (
                <>
                  <Em>klesla o {formatDecimal(Math.abs(s.tpDelta))} p. b.</Em>{' '}
                  na{' '}
                </>
              ) : (
                <>zůstala stabilní na </>
              )}
              <Em>{formatPercent(s.current.avgTotalPerformance)}</Em>
              {s.prodDelta !== null ? (
                <>
                  {' '}
                  a produktivita se{' '}
                  {s.prodDelta >= 0.05
                    ? `zlepšila o ${formatDecimal(s.prodDelta)} p. b.`
                    : s.prodDelta <= -0.05
                      ? `snížila o ${formatDecimal(Math.abs(s.prodDelta))} p. b.`
                      : 'držela na stejné úrovni.'}
                </>
              ) : (
                '.'
              )}
            </p>
          ) : (
            <p>
              Průměrná Total Performance dosáhla{' '}
              <Em>{formatPercent(s.current.avgTotalPerformance)}</Em>. Pro
              srovnání s minulým obdobím importujte starší report.
            </p>
          )}

          {s.bestMove && s.worstMove && (
            <p>
              Největší zlepšení zaznamenal tým{' '}
              <Link
                to={`/managers/${encodeURIComponent(s.bestMove.manager)}`}
                className="font-semibold text-[#2e7d00] hover:underline dark:text-[#5ed312]"
              >
                {s.bestMove.manager}
              </Link>{' '}
              (+{formatDecimal(s.bestMove.delta)} p. b.)
              {s.worstMove.delta < 0 ? (
                <>
                  , naopak největší propad tým{' '}
                  <Link
                    to={`/managers/${encodeURIComponent(s.worstMove.manager)}`}
                    className="font-semibold text-[#b02020] hover:underline dark:text-[#f07575]"
                  >
                    {s.worstMove.manager}
                  </Link>{' '}
                  ({formatDecimal(s.worstMove.delta)} p. b.)
                </>
              ) : (
                <> — žádný tým se meziobdobně nezhoršil</>
              )}
              .
            </p>
          )}

          <p>
            Největší rezervy jsou v metrice <Em>{s.weakestPercent?.label}</Em>{' '}
            ({formatPercent(s.weakestPercent?.value ?? null)})
            {s.weakestCsat && (
              <>
                {' '}
                a v kanálu <Em>{s.weakestCsat.label}</Em> (průměr{' '}
                {formatDecimal(s.weakestCsat.value)})
              </>
            )}
            . Nejsilnějším týmem období je{' '}
            <Link
              to={`/managers/${encodeURIComponent(s.teams[0].manager)}`}
              className="font-semibold text-[#2e7d00] hover:underline dark:text-[#5ed312]"
            >
              {s.teams[0].manager}
            </Link>{' '}
            s průměrem {formatPercent(s.teams[0].avgTotalPerformance)}.
          </p>

          <p className="flex items-center gap-2 rounded-lg border p-3 font-medium">
            {s.goalMet ? (
              <>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#2e7d00] dark:text-[#5ed312]" />
                Celkově firma svůj cíl {formatPercent(s.target)} splnila (Ø{' '}
                {formatPercent(s.current.avgTotalPerformance)}).
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 shrink-0 text-[#b02020] dark:text-[#f07575]" />
                Celkově firma svůj cíl {formatPercent(s.target)} nesplnila (Ø{' '}
                {formatPercent(s.current.avgTotalPerformance)}).
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Supporting numbers */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: Users,
            label: 'Operátorů nad cílem',
            value: `${formatInt(s.aboveTarget)} / ${formatInt(s.measured)}`,
          },
          {
            icon: TrendingUp,
            label: 'Ø Total Performance',
            value: formatPercent(s.current.avgTotalPerformance),
          },
          {
            icon: Target,
            label: 'Nejslabší metrika',
            value: s.weakestPercent?.label ?? '–',
          },
          {
            icon: Sparkles,
            label: 'Nejlepší tým',
            value: s.teams[0].manager,
          },
        ].map((stat) => (
          <Card key={stat.label} className="animate-fade-in-up">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-accent p-2 text-accent-foreground">
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {stat.label}
                </p>
                <p className="truncate font-semibold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {topMovers.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="animate-fade-in-up">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpRight className="h-4 w-4 text-[#2e7d00] dark:text-[#5ed312]" />
                Skokani období
              </CardTitle>
              <CardDescription>
                Největší zlepšení Total Performance vs. {previousId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {topMovers.slice(0, 5).map(({ record, delta }) => (
                  <li key={record.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                      onClick={() => openOperator(record.fullName)}
                    >
                      <span className="truncate font-medium">
                        {record.fullName}
                      </span>
                      <DeltaBadge
                        delta={delta}
                        format={(v) => `${formatDecimal(v)} p. b.`}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="animate-fade-in-up">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowDownRight className="h-4 w-4 text-[#b02020] dark:text-[#f07575]" />
                Vyžadují pozornost
              </CardTitle>
              <CardDescription>
                Největší pokles Total Performance vs. {previousId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {topMovers
                  .slice(-5)
                  .reverse()
                  .map(({ record, delta }) => (
                    <li key={record.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                        onClick={() => openOperator(record.fullName)}
                      >
                        <span className="truncate font-medium">
                          {record.fullName}
                        </span>
                        <DeltaBadge
                          delta={delta}
                          format={(v) => `${formatDecimal(v)} p. b.`}
                        />
                      </button>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
