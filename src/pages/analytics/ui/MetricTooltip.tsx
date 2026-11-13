import { Button, Tooltip } from 'antd'
import { useEffect, useState, type JSX, type ReactElement } from 'react'

import styles from './MetricTooltip.module.css'

export function MetricTooltip(props: { title: string; children: ReactElement }): JSX.Element {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <Tooltip
      destroyOnHidden
      onOpenChange={setOpen}
      open={open}
      title={props.title}
      trigger={['hover', 'focus']}
    >
      {props.children}
    </Tooltip>
  )
}

export function ChartHeading(props: { label: string; help: string }): JSX.Element {
  return (
    <figcaption className={styles.caption}>
      <MetricTooltip title={props.help}>
        <Button className={styles.headingButton} size="small" type="text">
          {props.label}
        </Button>
      </MetricTooltip>
    </figcaption>
  )
}
