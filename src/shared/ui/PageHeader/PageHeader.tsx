import type { JSX, ReactNode } from 'react'

import { cx } from '../lib/cx'
import styles from './PageHeader.module.css'

export interface PageHeaderProps {
  title: string
  /** One line under the title: what the page shows or a short summary of its data. */
  description?: ReactNode
  /** Page-level actions on the right. The single primary button of the page goes last. */
  actions?: ReactNode
  className?: string
}

/** Title of a page. It sits directly on the page: no card around it. */
export function PageHeader(props: PageHeaderProps): JSX.Element {
  const { title, description, actions, className } = props
  const isEmpty = (node: ReactNode): boolean =>
    node === undefined || node === null || node === false || node === ''
  const hasDescription = !isEmpty(description)
  const hasActions = !isEmpty(actions)
  return (
    <header className={cx(styles.header, className)}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {hasDescription ? <p className={styles.description}>{description}</p> : null}
      </div>
      {hasActions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
