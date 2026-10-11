import type { JSX } from 'react'

export interface LogoProps {
  size?: number
  /** Accessible name. Leave empty when the product name is written next to the mark. */
  title?: string
  className?: string
}

/** The Reviewer mark: a circle cut by a narrow slit shifted to the right. Inherits `currentColor`. */
export function Logo(props: LogoProps): JSX.Element {
  const { size = 24, title, className } = props
  return (
    <svg
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      className={className}
      fill="currentColor"
      focusable="false"
      height={size}
      role={title === undefined ? undefined : 'img'}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M14.5 2.318A10 10 0 1 0 14.5 21.682Z" />
      <path d="M17 3.34A10 10 0 0 1 17 20.66Z" />
    </svg>
  )
}
