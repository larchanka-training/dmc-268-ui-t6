import type { JSX } from 'react'

import styles from './DurationByDay.module.css'

interface DayDuration {
  day: string
  averageDurationSeconds: number
}

export function DurationByDay(props: {
  series: readonly DayDuration[]
  label: string
}): JSX.Element {
  const { series, label } = props
  const width = 640
  const height = 200
  const padBottom = 4
  const innerHeight = height - padBottom
  const max = Math.max(1, ...series.map((point) => point.averageDurationSeconds))
  const slot = width / Math.max(series.length, 1)
  const points = series.map((point, index) => {
    const x = index * slot + slot / 2
    const y = innerHeight - (point.averageDurationSeconds / max) * innerHeight
    return { ...point, x, y }
  })
  const line = points.map((point) => `${String(point.x)},${String(point.y)}`).join(' ')

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
          y1={String(innerHeight)}
          y2={String(innerHeight)}
        />
        {points.length > 0 ? (
          <polyline className={styles.line} points={line} strokeWidth="1.5" />
        ) : null}
        {points.map((point) => (
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
