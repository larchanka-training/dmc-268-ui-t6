import type { Meta, StoryObj } from '@storybook/react-vite'
import type { TableColumnsType } from 'antd'

import { Tag } from '../Tag/Tag'
import { DataTable } from './DataTable'

interface Row {
  id: number
  title: string
  repo: string
  status: 'running' | 'succeeded' | 'failed'
  engine: string
}

const rows: Row[] = [
  {
    id: 32,
    title: 'feat: refactor diff viewer',
    repo: 'dmc-268-ui-t6',
    status: 'running',
    engine: 'deep',
  },
  {
    id: 34,
    title: 'feat: frontend architecture skeleton',
    repo: 'dmc-268-ui-t6',
    status: 'succeeded',
    engine: 'deep',
  },
  {
    id: 35,
    title: 'feat: add timeout handling',
    repo: 'dmc-268-api-t6',
    status: 'failed',
    engine: 'fast',
  },
]

const TONE = { running: 'info', succeeded: 'success', failed: 'danger' } as const

const columns: TableColumnsType<Row> = [
  { title: 'PR', key: 'pr', render: (_, row) => `#${String(row.id)} ${row.title}` },
  { title: 'Репозиторий', dataIndex: 'repo', key: 'repo' },
  {
    title: 'Статус ревью',
    key: 'status',
    render: (_, row) => (
      <Tag pulse={row.status === 'running'} tone={TONE[row.status]}>
        {row.status}
      </Tag>
    ),
  },
  { title: 'Движок', dataIndex: 'engine', key: 'engine' },
]

const meta: Meta<typeof DataTable<Row>> = {
  title: 'Свои компоненты/DataTable',
  component: DataTable<Row>,
  args: { columns, dataSource: rows, rowKey: 'id' },
}

export default meta
type Story = StoryObj<typeof DataTable<Row>>

/** A table is the one place that gets a frame. The page title and the toolbar stay outside it. */
export const Default: Story = {}

export const WithPagination: Story = { args: { pagination: { pageSize: 2 } } }

export const Empty: Story = {
  args: { dataSource: [], locale: { emptyText: 'Нет прогонов ревью' } },
}

/** Loading keeps the rows in place and puts the ring over them. */
export const Loading: Story = { args: { loading: true } }

/** The first load, when there are no rows yet. */
export const LoadingEmpty: Story = { args: { dataSource: [], loading: true } }
