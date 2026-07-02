import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { useReportData } from '@/hooks/useReportData'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
  showPeriod?: boolean
}

export function PageHeader({
  title,
  description,
  actions,
  showPeriod = true,
}: PageHeaderProps) {
  const { activePeriod } = useReportData()
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div
          className="mb-2 h-1 w-12 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, var(--brand-green), var(--brand-azure))',
          }}
        />
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {showPeriod && activePeriod && (
            <Badge variant="secondary">{activePeriod}</Badge>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
