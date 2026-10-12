import { Tree, type TreeProps } from 'antd'
import type { JSX } from 'react'

import { cx } from '../lib/cx'
import styles from './TraceTree.module.css'

/**
 * Ant Design `Tree` that reads like a trace: monospace, compact, with a narrow indent. For a log
 * of steps or calls. Selection and hover stay the ones of the theme.
 */
export function TraceTree(props: TreeProps): JSX.Element {
  const { className, ...rest } = props
  return <Tree {...rest} className={cx(styles.trace, className)} />
}
