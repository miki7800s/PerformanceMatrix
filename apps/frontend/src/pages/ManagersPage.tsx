import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Users } from 'lucide-react'
import { useReportData } from '@/hooks/useReportData'
import { computeTeams } from '@/utils/analytics'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { CsatValue, PercentValue } from '@/components/PerformanceValue'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function ManagersPage() {
  const { loading, records, activePeriod } = useReportData()
  const teams = useMemo(() => computeTeams(records), [records])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </div>
    )
  }

  if (!activePeriod || teams.length === 0) {
    return (
      <>
        <PageHeader
          title="Manažeři"
          description="Přehled týmů a jejich výkonnosti"
          showPeriod={false}
        />
        <EmptyState />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Manažeři"
        description={`${teams.length} týmů seřazených podle Ø Total Performance`}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team, index) => (
          <Link
            key={team.manager}
            to={`/managers/${encodeURIComponent(team.manager)}`}
          >
            <Card className="h-full transition-shadow hover:shadow-md animate-fade-in-up">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{team.manager}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {team.operatorCount} operátorů
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Ø Total Performance
                    </p>
                    <PercentValue
                      value={team.avgTotalPerformance}
                      className="text-lg"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Ø Productivity
                    </p>
                    <PercentValue
                      value={team.avgProductivity}
                      className="text-lg"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Ø Internal Rating
                    </p>
                    <PercentValue
                      value={team.avgInternalRating}
                      className="text-lg"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Ø CSAT (Call/Chat/CCT)
                    </p>
                    <span className="space-x-1 text-sm">
                      <CsatValue value={team.avgCsatCall} />
                      <span className="text-muted-foreground">/</span>
                      <CsatValue value={team.avgCsatChat} />
                      <span className="text-muted-foreground">/</span>
                      <CsatValue value={team.avgCsatCct} />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
