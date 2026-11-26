import { Tooltip } from 'antd'
import type { JSX, ReactElement } from 'react'

export interface MetricTooltipProps {
  title: string
  /** One element that takes a ref and mouse and focus handlers; give it `tabIndex` when it is not a control. */
  children: ReactElement
}

export function MetricTooltip({ title, children }: MetricTooltipProps): JSX.Element {
  return (
    <Tooltip destroyOnHidden title={title} trigger={['hover', 'focus']}>
      {children}
    </Tooltip>
  )
}
