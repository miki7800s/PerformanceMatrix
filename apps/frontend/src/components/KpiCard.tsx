import { memo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/cn'

/** Brand accent of the icon chip. */
export type KpiAccent = 'green' | 'purple' | 'slate' | 'navy' | 'azure'

const ACCENT_STYLES: Record<KpiAccent, React.CSSProperties> = {
  green: { backgroundColor: 'rgba(94,211,18,0.16)', color: '#2e7d00' },
  purple: { backgroundColor: 'rgba(92,36,131,0.14)', color: '#5C2483' },
  slate: { backgroundColor: 'rgba(52,70,97,0.14)', color: '#344661' },
  navy: { backgroundColor: 'rgba(22,65,148,0.13)', color: '#164194' },
  azure: { backgroundColor: 'rgba(0,148,231,0.13)', color: '#0077b9' },
}

const ACCENT_STYLES_DARK: Record<KpiAccent, React.CSSProperties> = {
  green: { backgroundColor: 'rgba(94,211,18,0.16)', color: '#5ED312' },
  purple: { backgroundColor: 'rgba(176,106,194,0.16)', color: '#c88fd8' },
  slate: { backgroundColor: 'rgba(139,152,169,0.16)', color: '#aab6c5' },
  navy: { backgroundColor: 'rgba(91,142,232,0.16)', color: '#7ba4ee' },
  azure: { backgroundColor: 'rgba(0,148,231,0.18)', color: '#41b5f4' },
}

interface KpiCardProps {
  title: string
  value: string
  icon: LucideIcon
  subtitle?: string
  valueClassName?: string
  /** Brand color of the icon chip (default green). */
  accent?: KpiAccent
  /** When set, the card is clickable (used for KPI drill-down). */
  onClick?: () => void
}

/** Stat tile — a headline number with its label, not a chart. */
export const KpiCard = memo(function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  valueClassName,
  accent = 'green',
  onClick,
}: KpiCardProps) {
  const { theme } = useTheme()
  const accentStyle =
    theme === 'dark' ? ACCENT_STYLES_DARK[accent] : ACCENT_STYLES[accent]
  const content = (
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{title}</p>
          <p className={cn('mt-1 text-2xl font-bold', valueClassName)}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <div className="rounded-lg p-2" style={accentStyle}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </CardContent>
  )

  if (onClick) {
    return (
      <Card
        className="animate-fade-in-up cursor-pointer text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        role="button"
        tabIndex={0}
        title="Klikněte pro detail KPI"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
      >
        {content}
      </Card>
    )
  }

  return <Card className="animate-fade-in-up">{content}</Card>
})
