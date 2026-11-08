import type { JSX } from 'react'

import { formatDuration, useTranslation } from '../../../shared/i18n'
import { useChartRovingFocus } from '../lib/useChartRovingFocus'
import styles from './DurationByDay.module.css'
import { ChartHeading, MetricTooltip } from './MetricTooltip'

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
  const { t } = useTranslation()
  const width = 640
  const height = 200
  const padTop = 4
  const padBottom = 4
  const innerHeight = height - padTop - padBottom

  const hasData = (point: DayDuration): boolean => point.averageDurationSeconds > 0
  const slot = width / Math.max(series.length, 1)
  const activeSeries = series.filter(hasData)
  const max = Math.max(1, ...activeSeries.map((point) => point.averageDurationSeconds))

  const points = series.map((point, index) => {
    const active = hasData(point)
    const x = index * slot + slot / 2
    const y = active
      ? padTop + innerHeight - (point.averageDurationSeconds / max) * innerHeight
      : padTop + innerHeight
    return { ...point, active, x, y }
  })

  const segments: string[] = []
  let current: string[] = []
  for (const point of points) {
    if (!point.active) {
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

  const visiblePoints = points.filter((point) => point.active)
  const { getItemProps } = useChartRovingFocus<SVGCircleElement>(visiblePoints.length)

  return (
    <figure>
      <ChartHeading help={t('analytics.durationByDayHelp')} label={label} />
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
          y1={String(height - padBottom)}
          y2={String(height - padBottom)}
        />
        {segments.map((segment, index) => (
          <polyline key={index} className={styles.line} fill="none" points={segment} />
        ))}
        {visiblePoints.map((point, index) => {
          const tooltip = `${point.day}: ${formatDuration(point.averageDurationSeconds * 1000)}`
          return (
            <MetricTooltip key={point.day} title={tooltip}>
              <circle
                aria-label={tooltip}
                className={styles.point}
                cx={String(point.x)}
                cy={String(point.y)}
                r="3"
                role="graphics-symbol"
                {...getItemProps(index)}
              />
            </MetricTooltip>
          )
        })}
      </svg>
    </figure>
  )
}
