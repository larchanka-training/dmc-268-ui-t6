import { Button } from 'antd'
import type { JSX } from 'react'

import { MetricTooltip } from '../../../shared/ui'
import styles from './ChartHeading.module.css'

export function ChartHeading(props: { label: string; help: string }): JSX.Element {
  return (
    <figcaption className={styles.caption}>
      <MetricTooltip title={props.help}>
        <Button size="small" type="text">
          {props.label}
        </Button>
      </MetricTooltip>
    </figcaption>
  )
}
