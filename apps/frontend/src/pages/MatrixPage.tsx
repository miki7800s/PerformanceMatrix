import { useMemo, useRef, useState } from 'react'
import { Download, ImageDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import type { OperatorRecord } from '@/types'
import { useReportData } from '@/hooks/useReportData'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'
import { useOperatorDrawer } from '@/components/OperatorDrawer'
import { getVizColors, toneColor } from '@/components/charts/chartTheme'
import {
  formatDecimal,
  formatPercent,
  getPerformanceTone,
} from '@/utils/format'
import { average } from '@/utils/analytics'
import { exportRowsToExcel, exportSvgToPng } from '@/services/exportService'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ToneLegend } from '@/components/ToneLegend'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/utils/cn'

interface MatrixPoint {
  name: string
  manager: string
  x: number
  y: number
  z: number
  totalPerformance: number | null
}

const CSAT_TARGET = 4.3

/** Quadrant label for the exported dataset. */
function quadrantLabel(point: MatrixPoint, xTarget: number): string {
  const fastEnough = point.x >= xTarget
  const satisfied = point.y >= CSAT_TARGET
  if (fastEnough && satisfied) return 'Hvězdy'
  if (!fastEnough && satisfied) return 'Kvalita bez tempa'
  if (fastEnough && !satisfied) return 'Tempo bez kvality'
  return 'Prioritní coaching'
}

function buildPoints(records: OperatorRecord[]): MatrixPoint[] {
  return records
    .map((r) => {
      const csat = average([
        r.csatCallAverage,
        r.csatChatAverage,
        r.csatCctAverage,
      ])
      if (r.productivity === null || csat === null) return null
      const contacts =
        (r.csatCallCount ?? 0) + (r.csatChatCount ?? 0) + (r.csatCctCount ?? 0)
      return {
        name: r.fullName,
        manager: r.manager,
        x: r.productivity,
        y: csat,
        z: Math.max(contacts, 1),
        totalPerformance: r.totalPerformance,
      }
    })
    .filter((p): p is MatrixPoint => p !== null)
}

export function MatrixPage() {
  const { loading, records, periods, activePeriod, setActivePeriod } =
    useReportData()
  const { settings } = useSettings()
  const { theme } = useTheme()
  const { openOperator } = useOperatorDrawer()
  const colors = getVizColors(theme)

  const [manager, setManager] = useState('all')
  const [showLabels, setShowLabels] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  const managers = useMemo(
    () =>
      [...new Set(records.map((r) => r.manager))].sort((a, b) =>
        a.localeCompare(b, 'cs'),
      ),
    [records],
  )

  const points = useMemo(() => {
    const filtered =
      manager === 'all'
        ? records
        : records.filter((r) => r.manager === manager)
    return buildPoints(filtered)
  }, [records, manager])

  const xTarget = settings.thresholds.good
  const xMax = Math.max(...points.map((p) => p.x), xTarget + 10)
  const xMin = Math.min(...points.map((p) => p.x), 70)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    )
  }

  if (!activePeriod || records.length === 0) {
    return (
      <>
        <PageHeader
          title="Performance Matrix"
          description="Mapa produktivity a spokojenosti"
          showPeriod={false}
        />
        <EmptyState />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Performance Matrix"
        description="Každý bod je operátor: vpravo nahoře hvězdy, vlevo dole prioritní coaching. Velikost bodu = počet hodnocených kontaktů, barva = Total Performance. Kliknutím otevřete detail."
        actions={
          <div className="no-print flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const svg = chartRef.current?.querySelector<SVGSVGElement>(
                  'svg.recharts-surface',
                )
                if (!svg) {
                  toast.error('Graf se nepodařilo najít.')
                  return
                }
                try {
                  await exportSvgToPng(
                    svg,
                    `matrix-${activePeriod}${manager !== 'all' ? `-${manager}` : ''}`,
                    colors.surface,
                  )
                  toast.success('Matrix byl exportován jako PNG.')
                } catch {
                  toast.error('Export PNG selhal.')
                }
              }}
            >
              <ImageDown className="h-4 w-4" />
              PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportRowsToExcel(
                  points.map((point) => ({
                    Operátor: point.name,
                    Manager: point.manager,
                    'Produktivita (%)': point.x,
                    'CSAT Ø (1–5)': point.y,
                    'Počet kontaktů': point.z,
                    'Total Performance (%)': point.totalPerformance,
                    Kvadrant: quadrantLabel(point, xTarget),
                  })),
                  `matrix-${activePeriod}${manager !== 'all' ? `-${manager}` : ''}`,
                  'Performance Matrix',
                )
                toast.success('Data matrixu byla exportována do Excelu.')
              }}
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        }
      />

      <div className="no-print flex flex-wrap items-center gap-3">
        <Select
          className="w-56"
          value={manager}
          onChange={(e) => setManager(e.target.value)}
          aria-label="Filtr podle managera"
        >
          <option value="all">Všichni manažeři</option>
          {managers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select
          className="w-44"
          value={activePeriod}
          onChange={(e) => setActivePeriod(e.target.value)}
          aria-label="Filtr podle období"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            className="h-4 w-4 accent-[#5ED312]"
          />
          Zobrazit jména
        </label>
        <div className="ml-auto">
          <ToneLegend />
        </div>
      </div>

      <Card className="animate-fade-in-up">
        <CardContent className="pt-6" ref={chartRef}>
          <ResponsiveContainer width="100%" height={540}>
            <ScatterChart margin={{ top: 20, right: 28, bottom: 8, left: 0 }}>
              {/* quadrants */}
              <ReferenceArea
                x1={xTarget}
                y1={CSAT_TARGET}
                fill={colors.good}
                fillOpacity={0.05}
              />
              <ReferenceArea
                x2={xTarget}
                y2={CSAT_TARGET}
                fill={colors.critical}
                fillOpacity={0.05}
              />
              <CartesianGrid stroke={colors.grid} />
              <XAxis
                type="number"
                dataKey="x"
                name="Produktivita"
                domain={[Math.floor(xMin / 10) * 10, Math.ceil(xMax / 10) * 10]}
                tick={{ fill: colors.muted, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: colors.axis }}
                unit=" %"
                label={{
                  value: 'Produktivita →',
                  position: 'insideBottomRight',
                  offset: -4,
                  fill: colors.muted,
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="CSAT"
                domain={[3, 5]}
                tick={{ fill: colors.muted, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: 'CSAT ↑',
                  position: 'insideTopLeft',
                  fill: colors.muted,
                  fontSize: 12,
                }}
              />
              <ZAxis type="number" dataKey="z" range={[50, 420]} />
              <ReferenceLine
                x={xTarget}
                stroke={colors.muted}
                strokeDasharray="5 4"
                label={{
                  value: `cíl ${xTarget} %`,
                  position: 'top',
                  fill: colors.muted,
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                y={CSAT_TARGET}
                stroke={colors.muted}
                strokeDasharray="5 4"
                label={{
                  value: `CSAT ${CSAT_TARGET}`,
                  position: 'insideBottomRight',
                  fill: colors.muted,
                  fontSize: 11,
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '4 4', stroke: colors.muted }}
                content={({ payload }) => {
                  const point = payload?.[0]?.payload as
                    | MatrixPoint
                    | undefined
                  if (!point) return null
                  return (
                    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold">{point.name}</p>
                      <p className="text-muted-foreground">{point.manager}</p>
                      <p className="mt-1">
                        Produktivita: {formatPercent(point.x)} · CSAT:{' '}
                        {formatDecimal(point.y)}
                      </p>
                      <p>
                        Total Performance:{' '}
                        {formatPercent(point.totalPerformance)} ·{' '}
                        {point.z} kontaktů
                      </p>
                    </div>
                  )
                }}
              />
              <Scatter
                data={points}
                onClick={(payload) => {
                  const point = payload as unknown as MatrixPoint
                  if (point?.name) openOperator(point.name)
                }}
                className="cursor-pointer"
                isAnimationActive={points.length <= 300}
              >
                {points.map((point) => (
                  <Cell
                    key={point.name}
                    fill={toneColor(
                      getPerformanceTone(
                        point.totalPerformance,
                        settings.thresholds,
                      ),
                      colors,
                    )}
                    fillOpacity={0.75}
                    stroke={colors.surface}
                    strokeWidth={1}
                  />
                ))}
                {showLabels && (
                  <LabelList
                    dataKey="name"
                    position="top"
                    style={{ fill: colors.ink, fontSize: 10 }}
                  />
                )}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            {[
              ['⭐ Hvězdy', 'vysoká produktivita i CSAT'],
              ['🧭 Kvalita bez tempa', 'vysoký CSAT, nižší produktivita'],
              ['⚡ Tempo bez kvality', 'vysoká produktivita, nižší CSAT'],
              ['🎯 Prioritní coaching', 'pod cílem v obou osách'],
            ].map(([title, desc]) => (
              <div key={title} className={cn('rounded-lg border px-2.5 py-1.5')}>
                <span className="font-medium text-foreground">{title}</span>{' '}
                – {desc}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
