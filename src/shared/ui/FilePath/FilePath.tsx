import type { JSX } from 'react'

import { cx } from '../lib/cx'
import styles from './FilePath.module.css'

export interface FilePathProps {
  path: string
  className?: string
}

/**
 * A file path among other text: monospace 12px in the secondary colour. A long path wraps at any
 * character instead of being cut or widening the page: the end of a path is what tells files apart.
 */
export function FilePath(props: FilePathProps): JSX.Element {
  const { path, className } = props
  return <span className={cx(styles.path, className)}>{path}</span>
}
