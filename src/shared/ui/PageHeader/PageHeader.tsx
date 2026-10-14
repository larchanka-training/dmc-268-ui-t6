import type { JSX, ReactNode, Ref } from 'react'

import { cx } from '../lib/cx'
import styles from './PageHeader.module.css'

export interface PageHeaderProps {
  title: string
  /** One line under the title: what the page shows or a short summary of its data. */
  description?: ReactNode
  /** Page-level actions on the right. The single primary button of the page goes last. */
  actions?: ReactNode
  /**
   * Ref of the `<h1>`. Passing it also makes the heading focusable by script (`tabIndex=-1`, not
   * a Tab stop): a page moves focus there when the control the user used is gone.
   */
  titleRef?: Ref<HTMLHeadingElement>
  className?: string
}

/** Title of a page. It sits directly on the page: no card around it. */
export function PageHeader(props: PageHeaderProps): JSX.Element {
  const { title, description, actions, titleRef, className } = props
  const isEmpty = (node: ReactNode): boolean =>
    node === undefined || node === null || node === false || node === ''
  const hasDescription = !isEmpty(description)
  const hasActions = !isEmpty(actions)
  return (
    <header className={cx(styles.header, className)}>
      <div className={styles.text}>
        <h1
          className={styles.title}
          ref={titleRef}
          tabIndex={titleRef === undefined ? undefined : -1}
        >
          {title}
        </h1>
        {hasDescription ? <p className={styles.description}>{description}</p> : null}
      </div>
      {hasActions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
