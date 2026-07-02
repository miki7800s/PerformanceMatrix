import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const SEGMENT_LABELS: Record<string, string> = {
  operators: 'Operátoři',
  managers: 'Manažeři',
  import: 'Import',
  history: 'Historie',
  compare: 'Porovnání období',
  ranking: 'Ranking',
  matrix: 'Performance Matrix',
  heatmap: 'Heatmapa týmů',
  summary: 'Měsíční souhrn',
  settings: 'Nastavení',
}

/** Breadcrumb trail derived from the current route. */
export function Breadcrumbs() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`
    const label =
      SEGMENT_LABELS[segment] ?? decodeURIComponent(segment)
    return { path, label, last: index === segments.length - 1 }
  })

  return (
    <nav
      aria-label="Drobečková navigace"
      className="no-print mb-4 flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Link
        to="/"
        className="flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        Dashboard
      </Link>
      {crumbs.map((crumb) => (
        <Fragment key={crumb.path}>
          <ChevronRight className="h-3.5 w-3.5" />
          {crumb.last ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
