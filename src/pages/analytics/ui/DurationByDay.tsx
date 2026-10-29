import type { JSX } from 'react'

import styles from './DurationByDay.module.css'

interface DayDuration {
  day: string
  averageDurationSeconds: number
  runCount: number
}

export function DurationByDay(props: {
  series: readonly DayDuration[]
  label: string
}): JSX.Element {
  const { series, label } = props
  const width = 640
  const height = 200
  const padTop = 4
  const padBottom = 4
  const innerHeight = height - padTop - padBottom
  const plotted = series.filter((point) => point.runCount > 0)
  const max = Math.max(1, ...plotted.map((point) => point.averageDurationSeconds))
  const slot = width / Math.max(series.length, 1)
  const points = series.map((point, index) => {
    const x = index * slot + slot / 2
    const y = padTop + innerHeight - (point.averageDurationSeconds / max) * innerHeight
    return { ...point, x, y }
  })
  const segments: string[] = []
  let current: string[] = []
  for (const point of points) {
    if (point.runCount === 0) {
      if (current.length > 0) {
        segments.push(current.join(' '))
        current = []
      }
      continue
    }
    current.push(`${String(point.x)},${String(point.y)}`)
  }
  if (current.length > 0) {
    segments.push(current.join(' '))
  }

  return (
    <figure>
      <figcaption>{label}</figcaption>
      <svg
        aria-label={label}
        className={styles.chart}
        role="img"
        viewBox={`0 0 ${String(width)} ${String(height)}`}
      >
        <line
          className={styles.axis}
          x1="0"
          x2={String(width)}
          y1={String(height - padBottom)}
          y2={String(height - padBottom)}
        />
        {segments.map((segment) => (
          <polyline className={styles.line} key={segment} points={segment} strokeWidth="1.5" />
        ))}
        {points
          .filter((point) => point.runCount > 0)
          .map((point) => (
            <circle
              className={styles.point}
              cx={String(point.x)}
              cy={String(point.y)}
              key={point.day}
              r="3"
            >
              <title>{String(point.averageDurationSeconds)}</title>
            </circle>
          ))}
      </svg>
    </figure>
  )
}
