import { Segmented as AntdSegmented, type SegmentedProps as AntdSegmentedProps } from 'antd'
import type { JSX } from 'react'

export type SegmentedProps<ValueType = string | number> = Omit<
  AntdSegmentedProps<ValueType>,
  'aria-label' | 'tabIndex'
> & {
  'aria-label': string
}

/** A named radio group whose native radios provide its single keyboard stop. */
export function Segmented<ValueType = string | number>(
  props: SegmentedProps<ValueType>,
): JSX.Element {
  return <AntdSegmented {...props} tabIndex={-1} />
}
