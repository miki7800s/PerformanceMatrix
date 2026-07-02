import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpenText,
  GitCompareArrows,
  Grid3X3,
  Headset,
  History,
  LayoutDashboard,
  ScatterChart,
  Search,
  Settings,
  Star,
  Trophy,
  Upload,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useReportData } from '@/hooks/useReportData'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useOperatorDrawer } from '@/components/OperatorDrawer'
import { PercentValue } from '@/components/PerformanceValue'
import { cn } from '@/utils/cn'

interface PaletteItem {
  id: string
  group: 'Operátoři' | 'Manažeři' | 'Stránky'
  label: string
  hint?: string
  icon: LucideIcon
  watched?: boolean
  performance?: number | null
  run: () => void
}

const PAGES: { label: string; to: string; icon: LucideIcon }[] = [
  { label: 'Mission Control', to: '/', icon: LayoutDashboard },
  { label: 'Měsíční souhrn', to: '/summary', icon: BookOpenText },
  { label: 'Performance Matrix', to: '/matrix', icon: ScatterChart },
  { label: 'Heatmapa týmů', to: '/heatmap', icon: Grid3X3 },
  { label: 'Operátoři', to: '/operators', icon: Headset },
  { label: 'Manažeři', to: '/managers', icon: Users },
  { label: 'Ranking', to: '/ranking', icon: Trophy },
  { label: 'Porovnání období', to: '/compare', icon: GitCompareArrows },
  { label: 'Import', to: '/import', icon: Upload },
  { label: 'Historie', to: '/history', icon: History },
  { label: 'Nastavení', to: '/settings', icon: Settings },
]

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/**
 * Cmd/Ctrl+K command palette: fuzzy search across operators, managers
 * and pages. Diacritics-insensitive; operators open in the drawer.
 */
export function CommandPalette() {
  const navigate = useNavigate()
  const { records } = useReportData()
  const { openOperator } = useOperatorDrawer()
  const { isWatched } = useWatchlist()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpenEvent = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-command-palette', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-command-palette', onOpenEvent)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      // focus after the panel mounts
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const close = useCallback(() => setOpen(false), [])

  const items = useMemo<PaletteItem[]>(() => {
    const q = normalize(query.trim())
    const result: PaletteItem[] = []

    const managers = [...new Set(records.map((r) => r.manager))]

    if (q) {
      const matchedOperators = records
        .filter((r) => normalize(r.fullName).includes(q))
        .sort((a, b) => {
          // watched first, then prefix matches, then by name
          const aw = isWatched(a.fullName) ? 0 : 1
          const bw = isWatched(b.fullName) ? 0 : 1
          if (aw !== bw) return aw - bw
          const ap = normalize(a.fullName).startsWith(q) ? 0 : 1
          const bp = normalize(b.fullName).startsWith(q) ? 0 : 1
          if (ap !== bp) return ap - bp
          return a.fullName.localeCompare(b.fullName, 'cs')
        })
        .slice(0, 8)
      for (const record of matchedOperators) {
        result.push({
          id: `op:${record.fullName}`,
          group: 'Operátoři',
          label: record.fullName,
          hint: record.manager,
          icon: UserRound,
          watched: isWatched(record.fullName),
          performance: record.totalPerformance,
          run: () => {
            close()
            openOperator(record.fullName)
          },
        })
      }
      for (const manager of managers
        .filter((m) => normalize(m).includes(q))
        .slice(0, 5)) {
        result.push({
          id: `mg:${manager}`,
          group: 'Manažeři',
          label: manager,
          icon: Users,
          run: () => {
            close()
            navigate(`/managers/${encodeURIComponent(manager)}`)
          },
        })
      }
    }

    for (const page of PAGES.filter(
      (p) => !q || normalize(p.label).includes(q),
    ).slice(0, q ? 4 : 11)) {
      result.push({
        id: `pg:${page.to}`,
        group: 'Stránky',
        label: page.label,
        icon: page.icon,
        run: () => {
          close()
          navigate(page.to)
        },
      })
    }

    return result
  }, [query, records, isWatched, navigate, openOperator, close])

  useEffect(() => setSelected(0), [query])

  useEffect(() => {
    const element = listRef.current?.querySelector('[data-selected="true"]')
    element?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in-0"
        onClick={close}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Rychlé vyhledávání"
        className="absolute left-1/2 top-24 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border bg-card shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelected((s) => Math.min(s + 1, items.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelected((s) => Math.max(s - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                items[selected]?.run()
              }
            }}
            placeholder="Hledat operátora, manažera nebo stránku…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nic nenalezeno.
            </p>
          ) : (
            (['Operátoři', 'Manažeři', 'Stránky'] as const).map((group) => {
              const groupItems = items.filter((i) => i.group === group)
              if (groupItems.length === 0) return null
              return (
                <div key={group} className="mb-1">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {group}
                  </p>
                  {groupItems.map((item) => {
                    const index = items.indexOf(item)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-selected={index === selected}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                          index === selected
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-muted',
                        )}
                        onMouseEnter={() => setSelected(index)}
                        onClick={item.run}
                      >
                        <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {item.label}
                          {item.watched && (
                            <Star className="ml-1.5 inline h-3 w-3 fill-[#eda100] text-[#eda100]" />
                          )}
                        </span>
                        {item.hint && (
                          <span className="truncate text-xs text-muted-foreground">
                            {item.hint}
                          </span>
                        )}
                        {item.performance !== undefined && (
                          <PercentValue
                            value={item.performance}
                            className="text-xs"
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ pohyb</span>
          <span>Enter otevřít</span>
          <span className="ml-auto">Ctrl/⌘ + K</span>
        </div>
      </div>
    </div>
  )
}
