import { Table, type TableProps } from 'antd'
import type { JSX } from 'react'

import { cx } from '../lib/cx'
import styles from './DataTable.module.css'

type TableScroll = NonNullable<TableProps<object>['scroll']>

type DataTableScroll = Omit<TableScroll, 'x'> & { x?: TableScroll['x'] | false }

export interface DataTableProps<Row> extends Omit<TableProps<Row>, 'scroll'> {
  /** An explicit false x value opts out of the default horizontal scrolling. */
  scroll?: DataTableScroll
  /** Keeps every cell on one line; the table scrolls sideways instead of wrapping. On by default. */
  nowrap?: boolean
}

/**
 * Ant Design `Table` with the defaults of the design system: cells stay on one line and the
 * pagination is the small one without a page-size switch. The frame and the header come from
 * `styles/antd.css`, so a plain `Table` looks the same; this wrapper only fixes the defaults.
 */
export function DataTable<Row extends object>(props: DataTableProps<Row>): JSX.Element {
  const { nowrap = true, className, pagination, scroll, ...rest } = props
  const x = scroll?.x === false ? undefined : (scroll?.x ?? (nowrap ? 'max-content' : undefined))
  const tableScroll = scroll || nowrap ? { ...scroll, x } : undefined
  return (
    <Table<Row>
      {...rest}
      scroll={tableScroll}
      className={cx(nowrap && styles.nowrap, className)}
      pagination={
        pagination === false || pagination === undefined
          ? false
          : { showSizeChanger: false, size: 'small', ...pagination }
      }
    />
  )
}
