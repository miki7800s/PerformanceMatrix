import { NavLink } from 'react-router-dom'
import {
  BookOpenText,
  GitCompareArrows,
  Grid3X3,
  Headset,
  History,
  LayoutDashboard,
  Moon,
  ScatterChart,
  Search as SearchIcon,
  Settings,
  Sun,
  Trophy,
  Upload,
  Users,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useReportData } from '@/hooks/useReportData'
import { cn } from '@/utils/cn'

const NAV_SECTIONS: {
  title: string
  items: { to: string; label: string; icon: typeof Grid3X3; end: boolean }[]
}[] = [
  {
    title: 'Přehled',
    items: [
      { to: '/', label: 'Mission Control', icon: LayoutDashboard, end: true },
      { to: '/summary', label: 'Měsíční souhrn', icon: BookOpenText, end: false },
    ],
  },
  {
    title: 'Analýza',
    items: [
      { to: '/matrix', label: 'Matrix', icon: ScatterChart, end: false },
      { to: '/heatmap', label: 'Heatmapa', icon: Grid3X3, end: false },
      { to: '/operators', label: 'Operátoři', icon: Headset, end: false },
      { to: '/managers', label: 'Manažeři', icon: Users, end: false },
      { to: '/ranking', label: 'Ranking', icon: Trophy, end: false },
      {
        to: '/compare',
        label: 'Porovnání',
        icon: GitCompareArrows,
        end: false,
      },
    ],
  },
  {
    title: 'Data',
    items: [
      { to: '/import', label: 'Import', icon: Upload, end: false },
      { to: '/history', label: 'Historie', icon: History, end: false },
      { to: '/settings', label: 'Nastavení', icon: Settings, end: false },
    ],
  },
]

/**
 * Brand sidebar: slate→navy gradient with the green as the active
 * accent. Deliberately identical in light and dark mode.
 */
export function Sidebar() {
  const { theme, toggleTheme } = useTheme()
  const { periods, activePeriod, setActivePeriod } = useReportData()

  return (
    <aside
      className="no-print relative z-10 flex h-full w-16 shrink-0 flex-col text-white lg:w-60"
      style={{
        background:
          'linear-gradient(170deg, #344661 0%, #22355c 45%, #164194 100%)',
      }}
    >
      <div className="flex h-16 items-center gap-2.5 px-3 lg:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5ED312] text-sm font-black text-[#10300b] shadow-[0_0_18px_rgba(94,211,18,0.45)]">
          CC
        </div>
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-bold leading-tight tracking-wide">
            Care Performance
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">
            Dashboard
          </p>
        </div>
      </div>

      <div className="px-2 pb-1 lg:px-3">
        <button
          type="button"
          aria-label="Rychlé vyhledávání"
          onClick={() =>
            window.dispatchEvent(new Event('open-command-palette'))
          }
          className="flex w-full items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm text-white/55 transition-colors hover:bg-white/10 hover:text-white/85"
        >
          <SearchIcon className="h-4 w-4 shrink-0" />
          <span className="hidden flex-1 text-left lg:inline">Hledat…</span>
          <kbd className="hidden rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] lg:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="mx-3 mb-2 hidden h-px bg-gradient-to-r from-transparent via-white/25 to-transparent lg:block" />

      <nav className="flex-1 space-y-4 overflow-y-auto p-2 lg:p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="hidden px-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 lg:block">
              {section.title}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-[#5ED312] font-semibold text-[#10300b] shadow-[0_2px_14px_rgba(94,211,18,0.4)]'
                      : 'text-white/65 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3">
        {periods.length > 0 && (
          <div className="hidden lg:block">
            <label
              htmlFor="sidebar-period"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50"
            >
              Aktivní období
            </label>
            <select
              id="sidebar-period"
              value={activePeriod ?? ''}
              onChange={(e) => setActivePeriod(e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-medium text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#5ED312] [&>option]:bg-[#22355c] [&>option]:text-white"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ED312] lg:justify-start"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-[#5ED312]" />
          ) : (
            <Moon className="h-4 w-4 text-[#5ED312]" />
          )}
          <span className="hidden lg:inline">
            {theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
          </span>
        </button>
      </div>
    </aside>
  )
}
