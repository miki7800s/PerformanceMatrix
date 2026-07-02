import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { OperatorRecord } from '@/types'
import { useReportData } from '@/hooks/useReportData'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'
import { useOperatorDrawer } from '@/components/OperatorDrawer'
import { getVizColors, toneColor } from '@/components/charts/chartTheme'
import { formatPercent, getPerformanceTone } from '@/utils/format'
import { average } from '@/utils/analytics'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ToneLegend } from '@/components/ToneLegend'
import { PercentValue } from '@/components/PerformanceValue'
import { OperatorHoverCard } from '@/components/OperatorHoverCard'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface TeamRow {
  manager: string
  avg: number | null
  members: OperatorRecord[]
}

export function HeatmapPage() {
  const { loading, records, activePeriod } = useReportData()
  const { settings } = useSettings()
  const { theme } = useTheme()
  const { openOperator } = useOperatorDrawer()
  const colors = getVizColors(theme)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const teams = useMemo<TeamRow[]>(() => {
    const byManager = new Map<string, OperatorRecord[]>()
    for (const record of records) {
      const list = byManager.get(record.manager) ?? []
      list.push(record)
      byManager.set(record.manager, list)
    }
    return [...byManager.entries()]
      .map(([manager, members]) => ({
        manager,
        avg: average(members.map((m) => m.totalPerformance)),
        members: [...members].sort(
          (a, b) =>
            (b.totalPerformance ?? -Infinity) -
            (a.totalPerformance ?? -Infinity),
        ),
      }))
      // Weakest teams first — the page should surface problems itself.
      .sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity))
  }, [records])

  const toggle = (manager: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(manager)) next.delete(manager)
      else next.add(manager)
      return next
    })

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!activePeriod || teams.length === 0) {
    return (
      <>
        <PageHeader
          title="Heatmapa týmů"
          description="Výkon celé firmy na jedné obrazovce"
          showPeriod={false}
        />
        <EmptyState />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Heatmapa týmů"
        description="Každý řádek je tým, každá buňka operátor (barva = Total Performance). Nejslabší týmy jsou nahoře. Kliknutím na tým jej rozbalíte, kliknutím na buňku otevřete operátora."
        actions={<ToneLegend />}
      />

      <Card className="animate-fade-in-up">
        <CardContent className="space-y-1.5 pt-6">
          {teams.map((team) => {
            const isOpen = expanded.has(team.manager)
            return (
              <div key={team.manager} className="rounded-lg border">
                <div className="flex items-center gap-3 px-3 py-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => toggle(team.manager)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="w-40 shrink-0 truncate text-sm font-medium lg:w-52">
                      {team.manager}
                    </span>
                    {!isOpen && (
                      <span className="flex flex-1 flex-wrap gap-1">
                        {team.members.map((member) => (
                          <span
                            key={member.id}
                            role="button"
                            title={`${member.fullName} · ${formatPercent(member.totalPerformance)}`}
                            className="h-4 w-4 rounded-[4px] transition-transform hover:scale-125"
                            style={{
                              backgroundColor: toneColor(
                                getPerformanceTone(
                                  member.totalPerformance,
                                  settings.thresholds,
                                ),
                                colors,
                              ),
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              openOperator(member.fullName)
                            }}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {team.members.length} os.
                  </span>
                  <PercentValue
                    value={team.avg}
                    className="w-20 shrink-0 text-right text-sm"
                  />
                  <Link
                    to={`/managers/${encodeURIComponent(team.manager)}`}
                    className="no-print shrink-0 text-xs font-medium text-[#2e7d00] hover:underline dark:text-[#5ed312]"
                  >
                    Detail týmu
                  </Link>
                </div>

                {isOpen && (
                  <div className="grid grid-cols-2 gap-1.5 border-t p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 animate-fade-in-up">
                    {team.members.map((member) => {
                      const tone = getPerformanceTone(
                        member.totalPerformance,
                        settings.thresholds,
                      )
                      const color = toneColor(tone, colors)
                      return (
                        <OperatorHoverCard key={member.id} operator={member}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
                            style={{
                              borderLeft: `4px solid ${color}`,
                            }}
                            onClick={() => openOperator(member.fullName)}
                          >
                            <span className="truncate">{member.fullName}</span>
                            <span
                              className="font-semibold tabular-nums"
                              style={{ color }}
                            >
                              {formatPercent(member.totalPerformance)}
                            </span>
                          </button>
                        </OperatorHoverCard>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
