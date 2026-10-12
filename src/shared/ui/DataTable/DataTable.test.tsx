// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataTable } from './DataTable'
import styles from './DataTable.module.css'

afterEach(() => {
  cleanup()
})

interface Row {
  id: number
  name: string
}

const columns = [{ title: 'Название', dataIndex: 'name', key: 'name' }]
const rows: Row[] = [
  { id: 1, name: 'dmc-268-ui-t6' },
  { id: 2, name: 'dmc-268-api-t6' },
  { id: 3, name: 'dmc-268-infra-t6' },
]
// Ant Design shows the page-size switch on its own once a table has more than 50 rows, so only
// a longer list proves that the wrapper turns it off.
const manyRows: Row[] = Array.from({ length: 60 }, (_, index) => ({
  id: index,
  name: `repo-${String(index)}`,
}))

describe('DataTable', () => {
  it('renders the rows and no pagination by default', () => {
    const { container } = render(<DataTable<Row> columns={columns} dataSource={rows} rowKey="id" />)
    expect(screen.getByText('dmc-268-api-t6')).toBeTruthy()
    expect(container.querySelector('.ant-pagination')).toBeNull()
  })

  it('renders no pagination when it is switched off explicitly', () => {
    const { container } = render(
      <DataTable<Row> columns={columns} dataSource={manyRows} pagination={false} rowKey="id" />,
    )
    expect(container.querySelector('.ant-pagination')).toBeNull()
    expect(screen.getByText('repo-59')).toBeTruthy()
  })

  it('shows the small pagination without a page-size switch, even for a long list', () => {
    const { container } = render(
      <DataTable<Row>
        columns={columns}
        dataSource={manyRows}
        pagination={{ pageSize: 20 }}
        rowKey="id"
      />,
    )
    expect(container.querySelector('.ant-pagination')).not.toBeNull()
    expect(container.querySelector('.ant-pagination-small')).not.toBeNull()
    expect(container.querySelector('.ant-pagination-options')).toBeNull()
    expect(screen.queryByText('repo-20')).toBeNull()
  })

  it('lets a screen bring the page-size switch back', () => {
    const { container } = render(
      <DataTable<Row>
        columns={columns}
        dataSource={manyRows}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        rowKey="id"
      />,
    )
    expect(container.querySelector('.ant-pagination-options')).not.toBeNull()
  })

  it('keeps cells on one line by default and lets a table wrap them', () => {
    const { container, rerender } = render(
      <DataTable<Row> columns={columns} dataSource={rows} rowKey="id" />,
    )
    expect(styles.nowrap).toBeTruthy()
    const wrapper = (): Element | null => container.querySelector('.ant-table-wrapper')
    expect(wrapper()?.classList.contains(styles.nowrap ?? '')).toBe(true)
    rerender(<DataTable<Row> columns={columns} dataSource={rows} nowrap={false} rowKey="id" />)
    expect(wrapper()?.classList.contains(styles.nowrap ?? '')).toBe(false)
  })

  it('keeps its own class next to a class of the caller', () => {
    const { container } = render(
      <DataTable<Row> className="mine" columns={columns} dataSource={rows} rowKey="id" />,
    )
    const wrapper = container.querySelector('.ant-table-wrapper')
    expect(wrapper?.classList.contains('mine')).toBe(true)
    expect(wrapper?.classList.contains(styles.nowrap ?? '')).toBe(true)
  })
})
