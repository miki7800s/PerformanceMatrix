import { useTheme } from '@/hooks/useTheme'
import { getVizColors, toneColor } from '@/components/charts/chartTheme'
import { TONE_LABELS, type PerformanceTone } from '@/utils/format'

const ORDER: Exclude<PerformanceTone, 'none'>[] = [
  'excellent',
  'met',
  'slight',
  'attention',
  'critical',
]

/** Legend of the five-level tone scale used across matrix and heatmap. */
export function ToneLegend() {
  const { theme } = useTheme()
  const colors = getVizColors(theme)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {ORDER.map((tone) => (
        <span key={tone} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: toneColor(tone, colors) }}
          />
          {TONE_LABELS[tone]}
        </span>
      ))}
    </div>
  )
}
