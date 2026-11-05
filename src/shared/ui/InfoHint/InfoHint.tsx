import { InfoCircleOutlined } from '@ant-design/icons'
import { Button, Popover } from 'antd'
import { useRef, useState, type FC, type KeyboardEvent, type ReactNode } from 'react'

import styles from './InfoHint.module.css'

export interface InfoHintProps {
  label: string
  children: ReactNode
}

/** A short explanation stays visible beside this button; the details open on hover or action. */
export const InfoHint: FC<InfoHintProps> = ({ label, children }) => {
  const [open, setOpen] = useState(false)
  const clickedOpen = useRef(false)
  const clickPending = useRef(false)

  const onOpenChange = (next: boolean): void => {
    if (clickPending.current) {
      clickPending.current = false
      clickedOpen.current = !clickedOpen.current
      setOpen(clickedOpen.current)
      return
    }
    if (!next) clickedOpen.current = false
    setOpen(next)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Escape') {
      setOpen(false)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((current) => !current)
    }
  }

  return (
    <Popover
      autoAdjustOverflow
      classNames={{ root: styles.popup }}
      content={children}
      destroyOnHidden
      onOpenChange={onOpenChange}
      open={open}
      placement="top"
      trigger={['hover', 'click']}
    >
      <Button
        aria-expanded={open}
        aria-label={label}
        icon={<InfoCircleOutlined />}
        onClickCapture={() => {
          clickPending.current = true
        }}
        onKeyDown={onKeyDown}
        size="middle"
        type="text"
      />
    </Popover>
  )
}
