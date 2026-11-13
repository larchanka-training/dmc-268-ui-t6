import type { JSX } from 'react'

import { useTranslation } from '../../../shared/i18n'
import { cx } from '../../../shared/ui'
import styles from './FindingsByDay.module.css'
import { ChartHeading, MetricTooltip } from './MetricTooltip'
import { useChartRovingFocus } from '../lib/useChartRovingFocus'

const CATEGORIES = [
  { key: 'security', labelKey: 'analytics.categorySecurity', className: styles.security },
  { key: 'correctness', labelKey: 'analytics.categoryBug', className: styles.correctness },
  { key: 'performance', labelKey: 'analytics.categoryPerformance', className: styles.performance },
  { key: 'readability', labelKey: 'analytics.categoryStyle', className: styles.readability },
] as const

interface DayFindings {
  day: string
  findingsByCategory: {
    security: number
    correctness: number
    performance: number
    readability: number
  }
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
      CATEGORIES.reduce((sum, category) => sum + point.findingsByCategory[category.key], 0),
    ),
  )
  const slot = width / Math.max(series.length, 1)

  const bars: {
    key: string
    className: string | undefined
    tooltipTitle: string
    height: number
    width: number
    x: number
    y: number
  }[] = []

  series.forEach((point, index) => {
    let stacked = 0
    const x = index * slot + slot * 0.2
    const barWidth = slot * 0.6
    for (const category of CATEGORIES) {
      const value = point.findingsByCategory[category.key]
      if (value <= 0) {
        continue
      }
      const barHeight = (value / max) * innerHeight
      const y = innerHeight - stacked - barHeight
      stacked += barHeight
      bars.push({
        key: `${point.day}-${category.key}`,
        className: category.className,
        tooltipTitle: `${point.day}: ${t(category.labelKey)} — ${String(value)}`,
        height: barHeight,
        width: barWidth,
        x,
        y,
      })
    }
  })

  const { getItemProps } = useChartRovingFocus<SVGRectElement>(bars.length)

  return (
    <figure>
      <ChartHeading help={t('analytics.findingsByDayHelp')} label={label} />
      <svg
        aria-label={label}
        className={styles.chart}
        role="group"
        viewBox={`0 0 ${String(width)} ${String(height)}`}
      >
        <line
          className={styles.axis}
          x1="0"
          x2={String(width)}
          y1={String(innerHeight)}
          y2={String(innerHeight)}
        />
        {bars.map((bar, index) => (
          <MetricTooltip key={bar.key} title={bar.tooltipTitle}>
            <rect
              aria-label={bar.tooltipTitle}
              className={cx(bar.className, styles.bar)}
              height={String(bar.height)}
              role="graphics-symbol"
              width={String(bar.width)}
              x={String(bar.x)}
              y={String(bar.y)}
              {...getItemProps(index)}
            />
          </MetricTooltip>
        ))}
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
