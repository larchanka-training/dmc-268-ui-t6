import type { JSX } from 'react'

import { useTranslation } from '../../../shared/i18n'
import { cx } from '../../../shared/ui'
import styles from './FindingsByDay.module.css'

const CATEGORIES = [
  { key: 'security', labelKey: 'analytics.categorySecurity', className: styles.security },
  { key: 'correctness', labelKey: 'analytics.categoryBug', className: styles.correctness },
  { key: 'performance', labelKey: 'analytics.categoryPerformance', className: styles.performance },
  { key: 'readability', labelKey: 'analytics.categoryStyle', className: styles.readability },
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
  const { t } = useTranslation()
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
                    <title>{`${t(category.labelKey)} ${String(value)}`}</title>
                  </rect>
                )
              })}
            </g>
          )
        })}
      </svg>
      <ul className={styles.legend}>
        {CATEGORIES.map((category) => (
          <li key={category.key}>
            <span aria-hidden="true" className={cx(styles.dot, category.className)} />
            {t(category.labelKey)}
          </li>
        ))}
      </ul>
    </figure>
  )
}
