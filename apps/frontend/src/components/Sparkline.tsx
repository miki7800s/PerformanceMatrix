import { memo } from 'react'

interface SparklineProps {
  values: (number | null)[]
  width?: number
  height?: number
  stroke?: string
  /** Highlight the last point. */
  emphasizeLast?: boolean
}

/** Tiny dependency-free SVG line chart for hover cards and drawers. */
export const Sparkline = memo(function Sparkline({
  values,
  width = 120,
  height = 32,
  stroke = 'currentColor',
  emphasizeLast = true,
}: SparklineProps) {
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length < 2) {
    return (
      <span className="text-xs text-muted-foreground">bez historie</span>
    )
  }
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1
  const pad = 3
  const points = values
    .map((v, i) => {
      if (v === null) return null
      const x = pad + (i / (values.length - 1)) * (width - pad * 2)
      const y = pad + (1 - (v - min) / range) * (height - pad * 2)
      return { x, y }
    })
    .filter((p): p is { x: number; y: number } => p !== null)

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
  const last = points[points.length - 1]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="overflow-visible"
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {emphasizeLast && (
        <circle cx={last.x} cy={last.y} r={3} fill={stroke} />
      )}
    </svg>
  )
})
