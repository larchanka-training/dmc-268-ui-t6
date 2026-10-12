import { Button } from 'antd'
import type { ComponentProps, JSX } from 'react'

import { cx } from '../lib/cx'
import styles from './RowButton.module.css'

export type RowButtonProps = Omit<
  ComponentProps<typeof Button>,
  'type' | 'block' | 'shape' | 'variant' | 'color'
>

/**
 * A text button that is a whole row: full width, content aligned to the start, as tall as its
 * content and free to wrap. For a row that opens something: a collapsed comment, the user menu.
 * `size="large"` gives the row the height of a large control.
 */
export function RowButton(props: RowButtonProps): JSX.Element {
  const { className, ...rest } = props
  return <Button {...rest} block className={cx(styles.row, className)} type="text" />
}
