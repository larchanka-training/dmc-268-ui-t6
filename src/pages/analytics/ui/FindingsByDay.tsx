import type { JSX } from 'react'

import styles from './FindingsByDay.module.css'

const CATEGORIES = [
  { key: 'security', label: 'Security', className: styles.security },
  { key: 'correctness', label: 'Bug', className: styles.correctness },
  { key: 'performance', label: 'Performance', className: styles.performance },
  { key: 'readability', label: 'Style', className: styles.readability },
] as const

interface DayFindings {
  day: string
  findings: { security: number; correctness: number; performance: number; readability: number }
}

export function FindingsByDay(props: {
  series: readonly DayFindings[]
  label: string
}): JSX.Element {
  const { series, label } = props
  const width = 640
  const height = 200
  const padBottom = 4
  const innerHeight = height - padBottom
  const max = Math.max(
    1,
    ...series.map((point) =>
      CATEGORIES.reduce((sum, category) => sum + point.findings[category.key], 0),
    ),
  )
  const slot = width / Math.max(series.length, 1)

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
        {series.map((point, index) => {
          let stacked = 0
          const x = index * slot + slot * 0.2
          const barWidth = slot * 0.6
          return (
            <g key={point.day}>
              {CATEGORIES.map((category) => {
                const value = point.findings[category.key]
                const barHeight = (value / max) * innerHeight
                const y = innerHeight - stacked - barHeight
                stacked += barHeight
                return (
                  <rect
                    className={category.className}
                    height={String(barHeight)}
                    key={category.key}
                    width={String(barWidth)}
                    x={String(x)}
                    y={String(y)}
                  >
                    <title>{`${category.label} ${String(value)}`}</title>
                  </rect>
                )
              })}
            </g>
          )
        })}
      </svg>
      <ul>
        {CATEGORIES.map((category) => (
          <li key={category.key}>{category.label}</li>
        ))}
      </ul>
    </figure>
  )
}
