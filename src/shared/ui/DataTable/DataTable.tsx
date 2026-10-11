import { Table, type TableProps } from 'antd'
import type { JSX } from 'react'

import { cx } from '../lib/cx'
import styles from './DataTable.module.css'

export interface DataTableProps<Row> extends TableProps<Row> {
  /** Keeps every cell on one line; the table scrolls sideways instead of wrapping. On by default. */
  nowrap?: boolean
}

/**
 * Ant Design `Table` with the defaults of the design system: cells stay on one line and the
 * pagination is the small one without a page-size switch. The frame and the header come from
 * `styles/antd.css`, so a plain `Table` looks the same; this wrapper only fixes the defaults.
 */
export function DataTable<Row extends object>(props: DataTableProps<Row>): JSX.Element {
  const { nowrap = true, className, pagination, ...rest } = props
  return (
    <Table<Row>
      {...rest}
      className={cx(nowrap && styles.nowrap, className)}
      pagination={
        pagination === false || pagination === undefined
          ? false
          : { showSizeChanger: false, size: 'small', ...pagination }
      }
    />
  )
}
