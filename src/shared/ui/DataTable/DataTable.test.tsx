// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataTable } from './DataTable'

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

describe('DataTable', () => {
  it('renders the rows and no pagination by default', () => {
    const { container } = render(<DataTable<Row> columns={columns} dataSource={rows} rowKey="id" />)
    expect(screen.getByText('dmc-268-api-t6')).toBeTruthy()
    expect(container.querySelector('.ant-pagination')).toBeNull()
  })

  it('shows the small pagination without a page-size switch when pagination is set', () => {
    const { container } = render(
      <DataTable<Row>
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 2 }}
        rowKey="id"
      />,
    )
    expect(container.querySelector('.ant-pagination')).not.toBeNull()
    expect(container.querySelector('.ant-pagination-options-size-changer')).toBeNull()
    expect(screen.queryByText('dmc-268-infra-t6')).toBeNull()
  })
})
