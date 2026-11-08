import { Button } from 'antd'
import type { ComponentProps, JSX, MouseEvent, ReactNode } from 'react'
import { useHref, useLinkClickHandler } from 'react-router'

export interface LinkButtonProps extends Omit<ComponentProps<typeof Button>, 'href' | 'onClick'> {
  to: string
  children?: ReactNode
  onClick?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void
}

/**
 * A button that is a real link: it has a valid `href` and uses client-side routing
 * without a full page reload.
 */
export function LinkButton(props: LinkButtonProps): JSX.Element {
  const { to, children, target, onClick, ...rest } = props
  const href = useHref(to)
  const handleLinkClick = useLinkClickHandler<HTMLAnchorElement | HTMLButtonElement>(to, { target })

  const handleClick = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>): void => {
    onClick?.(event)
    if (!event.defaultPrevented) {
      handleLinkClick(event)
    }
  }

  return (
    <Button {...rest} href={href} onClick={handleClick} target={target}>
      {children}
    </Button>
  )
}
