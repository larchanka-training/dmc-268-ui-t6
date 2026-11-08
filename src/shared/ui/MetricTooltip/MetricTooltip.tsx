import { Tooltip } from 'antd'
import { useEffect, useState, type JSX, type ReactElement } from 'react'

export interface MetricTooltipProps {
  title: string
  children: ReactElement
}

export function MetricTooltip({ title, children }: MetricTooltipProps): JSX.Element {
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
      title={title}
      trigger={['hover', 'focus']}
    >
      {children}
    </Tooltip>
  )
}
