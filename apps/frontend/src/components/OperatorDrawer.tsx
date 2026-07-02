import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Star, X } from 'lucide-react'
import type { OperatorRecord } from '@/types'
import { useReportData } from '@/hooks/useReportData'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useOperatorHistory } from '@/hooks/useHistoryData'
import { useTheme } from '@/hooks/useTheme'
import { useSettings } from '@/hooks/useSettings'
import { getVizColors, toneColor } from '@/components/charts/chartTheme'
import {
  formatDecimal,
  formatPercent,
  getPerformanceTone,
  TONE_LABELS,
} from '@/utils/format'
import { ProgressRing } from '@/components/ProgressRing'
import { Sparkline } from '@/components/Sparkline'
import { DeltaBadge } from '@/components/DeltaBadge'
import { CsatValue } from '@/components/PerformanceValue'
import { Button } from '@/components/ui/button'

interface OperatorDrawerContextValue {
  openOperator: (fullName: string) => void
}

const OperatorDrawerContext = createContext<OperatorDrawerContextValue>({
  openOperator: () => {},
})

export function useOperatorDrawer() {
  return useContext(OperatorDrawerContext)
}

function DrawerContent({
  operator,
  onClose,
}: {
  operator: OperatorRecord
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { settings } = useSettings()
  const { isWatched, toggleWatch } = useWatchlist()
  const colors = getVizColors(theme)
  const history = useOperatorHistory(operator.fullName)
  const watched = isWatched(operator.fullName)

  const tone = getPerformanceTone(
    operator.totalPerformance,
    settings.thresholds,
  )
  const color = toneColor(tone, colors)

  const tpHistory = history.records.map((r) => r.totalPerformance)
  const previous =
    history.records.length >= 2
      ? history.records[history.records.length - 2]
      : null
  const delta =
    previous?.totalPerformance != null && operator.totalPerformance != null
      ? operator.totalPerformance - previous.totalPerformance
      : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b p-5">
        <div>
          <p className="text-lg font-bold leading-tight">
            {operator.fullName}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {operator.manager} · {operator.period}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={
              watched ? 'Odebrat ze sledovaných' : 'Přidat do sledovaných'
            }
            title={
              watched
                ? 'Odebrat z coaching watchlistu'
                : 'Sledovat na Mission Control'
            }
            className="rounded-md p-1.5 transition-all hover:bg-muted hover:scale-110"
            onClick={() => toggleWatch(operator.fullName)}
          >
            <Star
              className={
                watched
                  ? 'h-4 w-4 fill-[#eda100] text-[#eda100]'
                  : 'h-4 w-4 text-muted-foreground'
              }
            />
          </button>
          <button
            type="button"
            aria-label="Zavřít panel"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Total Performance
              </p>
              <p
                className="mt-0.5 text-3xl font-extrabold tabular-nums"
                style={{ color }}
              >
                {formatPercent(operator.totalPerformance)}
              </p>
              <p className="mt-0.5 text-xs font-medium" style={{ color }}>
                {tone !== 'none' ? TONE_LABELS[tone] : 'Bez hodnoty'}
              </p>
            </div>
            <div className="text-right">
              {delta !== null && (
                <DeltaBadge
                  delta={delta}
                  format={(v) => `${formatDecimal(v)} p. b.`}
                />
              )}
              <div className="mt-1.5" style={{ color }}>
                <Sparkline values={tpHistory} width={110} height={30} />
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                vývoj napříč obdobími
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Performance DNA
          </p>
          <div className="grid grid-cols-4 gap-2">
            <ProgressRing
              label="Total"
              value={operator.totalPerformance}
              size={74}
            />
            <ProgressRing
              label="Produkt."
              value={operator.productivity}
              size={74}
            />
            <ProgressRing
              label="Int. Rating"
              value={operator.internalRating}
              size={74}
            />
            <ProgressRing
              label="Attendance"
              value={operator.attendance}
              size={74}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            CSAT podle kanálu
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: 'Call',
                value: operator.csatCallAverage,
                count: operator.csatCallCount,
              },
              {
                label: 'Chat',
                value: operator.csatChatAverage,
                count: operator.csatChatCount,
              },
              {
                label: 'CCT',
                value: operator.csatCctAverage,
                count: operator.csatCctCount,
              },
            ].map((row) => (
              <div key={row.label} className="rounded-lg border p-2.5 text-center">
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <CsatValue value={row.value} className="text-lg" />
                <p className="text-[10px] text-muted-foreground">
                  {row.count ?? 0} hodnocení
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t p-4">
        <Button
          className="w-full"
          onClick={() => {
            onClose()
            navigate(`/operators/${encodeURIComponent(operator.fullName)}`)
          }}
        >
          Otevřít celý profil
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Global right-hand drawer for operator drill-down. Any component can
 * call openOperator(name) — no new windows, everything in one flow.
 */
export function OperatorDrawerProvider({ children }: { children: ReactNode }) {
  const { records } = useReportData()
  const [name, setName] = useState<string | null>(null)

  const openOperator = useCallback((fullName: string) => {
    setName(fullName)
  }, [])

  const close = useCallback(() => setName(null), [])

  useEffect(() => {
    if (!name) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [name, close])

  const operator = useMemo(
    () => (name ? (records.find((r) => r.fullName === name) ?? null) : null),
    [records, name],
  )

  const value = useMemo(() => ({ openOperator }), [openOperator])

  return (
    <OperatorDrawerContext.Provider value={value}>
      {children}
      {name && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in-0"
            onClick={close}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-label={`Detail operátora ${name}`}
            className="absolute right-0 top-0 h-full w-full max-w-md border-l bg-card shadow-2xl animate-in slide-in-from-right duration-300"
          >
            {operator ? (
              <DrawerContent operator={operator} onClose={close} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Operátor „{name}" není v aktivním období.
                </p>
                <Button variant="outline" onClick={close}>
                  Zavřít
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}
    </OperatorDrawerContext.Provider>
  )
}
