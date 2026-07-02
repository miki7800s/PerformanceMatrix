import type { Theme } from '@/hooks/useTheme'
import type { PerformanceTone } from '@/utils/format'

/**
 * Validated data-viz palette (see dataviz reference palette) — the dark
 * column is the same hues re-stepped for the dark surface, not a flip.
 * SVG presentation attributes don't support CSS var(), so charts pick
 * concrete hex values by theme.
 */
export interface VizColors {
  series: string[]
  sequential: { light: string; mid: string; dark: string }
  good: string
  warning: string
  serious: string
  critical: string
  grid: string
  axis: string
  muted: string
  ink: string
  surface: string
}

/*
 * Brand hues (green #5ED312, purple #5C2483, azure #0094E7, navy
 * #164194) snapped to validated chart steps. Both sets pass all six
 * palette checks (lightness band, chroma, CVD separation, contrast)
 * on their surface. Slot order is the CVD-safety mechanism — keep it.
 */
const LIGHT: VizColors = {
  series: [
    '#3fa30a', // 1 green  (brand primary, stepped for 3:1 on light)
    '#8a4fbf', // 2 purple
    '#8a6a00', // 3 gold
    '#0094e7', // 4 azure
    '#2f66c4', // 5 royal
  ],
  sequential: { light: '#8ed86a', mid: '#3fa30a', dark: '#26660a' },
  good: '#2e7d00',
  warning: '#b57a00',
  serious: '#ec835a',
  critical: '#d03b3b',
  grid: '#e3e8de',
  axis: '#c2ccc0',
  muted: '#64748b',
  ink: '#141b26',
  surface: '#f8faf6',
}

const DARK: VizColors = {
  series: [
    '#46a80c', // 1 green
    '#b06ac2', // 2 purple
    '#ad8a1e', // 3 gold
    '#0b8fd6', // 4 azure
    '#3b64c9', // 5 royal
  ],
  sequential: { light: '#6cc93a', mid: '#46a80c', dark: '#2c6c07' },
  good: '#5ed312',
  warning: '#e0a92c',
  serious: '#ec835a',
  critical: '#f07575',
  grid: '#26303f',
  axis: '#334052',
  muted: '#8b98a9',
  ink: '#ffffff',
  surface: '#141b26',
}

export function getVizColors(theme: Theme): VizColors {
  return theme === 'dark' ? DARK : LIGHT
}

/** Five-level information-bearing tone scale (see utils/format.ts). */
export function toneColor(tone: PerformanceTone, colors: VizColors): string {
  switch (tone) {
    case 'excellent':
      return colors.good // green — well above target
    case 'met':
      return colors.series[3] // azure — target met
    case 'slight':
      return colors.warning // yellow/gold — slightly below
    case 'attention':
      return colors.serious // orange — needs attention
    case 'critical':
      return colors.critical // red — critical
    default:
      return colors.muted
  }
}

/** Shared tooltip styling for Recharts. */
export function tooltipStyle(colors: VizColors): React.CSSProperties {
  return {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.grid}`,
    borderRadius: 8,
    color: colors.ink,
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  }
}
