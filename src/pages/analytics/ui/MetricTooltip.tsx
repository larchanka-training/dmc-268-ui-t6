import { Button } from 'antd'
import type { JSX } from 'react'

import { MetricTooltip } from '../../../shared/ui'
import styles from './MetricTooltip.module.css'

export { MetricTooltip }
export type { MetricTooltipProps } from '../../../shared/ui'

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
