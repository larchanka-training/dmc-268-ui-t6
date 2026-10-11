import type { JSX, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/**
 * Thin stroke icons that Ant Design's set does not have in this weight: navigation and the
 * sidebar toggle. Everything else comes from `@ant-design/icons`.
 */
function Icon(props: IconProps): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="16"
      {...props}
    />
  )
}

export function IconRepositories(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M6 19.5V5a2 2 0 0 1 2-2h10v14H8a2 2 0 0 0-2 2.5 2 2 0 0 0 2 1.5h10M10 7.5h4" />
    </Icon>
  )
}

export function IconRuns(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.2 8.6v6.8l5.4-3.4Z" />
    </Icon>
  )
}

export function IconSidebar(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <rect height="16" rx="3" width="18" x="3" y="4" />
      <path d="M9 4v16" />
    </Icon>
  )
}

export function IconSettings(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </Icon>
  )
}
