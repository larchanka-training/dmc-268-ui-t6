// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { Typography } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

import { DataTable } from './DataTable'
import styles from './DataTable.module.css'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// The wrap rule of DataTable.module.css, written out in full. Its selector names classes of Ant
// Design: one that no longer matches what Ant Design renders goes dead without an error
// (DESIGN_SYSTEM §11), so it is matched against a real table.
const WRAP_RULE = '.wrap :global(.ant-table-cell .ant-typography)'

/** `selector { declarations }` of every `.wrap` rule, comments dropped, whitespace collapsed. */
function wrapRules(): string[] {
  const css = readFileSync('src/shared/ui/DataTable/DataTable.module.css', 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )
  return [...css.matchAll(/^(\.wrap[^{]*?)\s*\{([^}]*)\}/gm)].map(
    (match) =>
      `${(match[1] ?? '').replace(/\s+/g, ' ')} { ${(match[2] ?? '').trim().replace(/\s+/g, ' ')} }`,
  )
}

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
  it('gives default nowrap tables an intrinsic width inside the horizontal scroller', () => {
    const { container } = render(<DataTable<Row> columns={columns} dataSource={rows} rowKey="id" />)
    expect(container.querySelector('table')?.style.width).toBe('max-content')
    expect(container.querySelector<HTMLElement>('.ant-table-content')?.style.overflowX).toBe('auto')
  })

  it('preserves an explicit numeric horizontal scroll width', () => {
    const { container } = render(
      <DataTable<Row> columns={columns} dataSource={rows} rowKey="id" scroll={{ x: 900 }} />,
    )
    expect(container.querySelector('table')?.style.width).toBe('900px')
  })

  it('preserves an explicit false horizontal width override', () => {
    const { container } = render(
      <DataTable<Row> columns={columns} dataSource={rows} rowKey="id" scroll={{ x: false }} />,
    )
    expect(container.querySelector('table')?.style.width).toBe('')
    expect(container.querySelector<HTMLElement>('.ant-table-content')?.style.overflowX).toBe('')
  })

  it('adds horizontal scrolling while retaining a caller vertical scroll limit', () => {
    const { container } = render(
      <DataTable<Row> columns={columns} dataSource={rows} rowKey="id" scroll={{ y: 160 }} />,
    )
    expect(container.querySelector('table')?.style.width).toBe('max-content')
    const body = container.querySelector<HTMLElement>('.ant-table-body')
    expect(body?.style.maxHeight).toBe('160px')
    expect(body?.style.overflowX).toBe('auto')
  })

  it('does not add horizontal scrolling when cells may wrap', () => {
    const { container, rerender } = render(
      <DataTable<Row> columns={columns} dataSource={rows} nowrap={false} rowKey="id" />,
    )
    expect(container.querySelector('table')?.style.width).toBe('')
    expect(container.querySelector<HTMLElement>('.ant-table-content')?.style.overflowX).toBe('')
    rerender(
      <DataTable<Row>
        columns={columns}
        dataSource={rows}
        nowrap={false}
        rowKey="id"
        scroll={{ x: 900 }}
      />,
    )
    expect(container.querySelector('table')?.style.width).toBe('900px')
  })

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
    const wrapper = (): Element | null => container.querySelector('.ant-table-wrapper')
    expect(wrapper()?.classList.contains(styles.nowrap ?? '')).toBe(true)
    rerender(<DataTable<Row> columns={columns} dataSource={rows} nowrap={false} rowKey="id" />)
    expect(wrapper()?.classList.contains(styles.nowrap ?? '')).toBe(false)
  })

  it('wraps text between words only, also inside Typography (DS §8, #239 D3)', () => {
    const { container } = render(
      <DataTable<Row> columns={columns} dataSource={rows} nowrap={false} rowKey="id" />,
    )
    const wrapper = container.querySelector('.ant-table-wrapper')
    expect(wrapper?.classList.contains(styles.wrap ?? '')).toBe(true)
    // jsdom computes no layout: the rule itself is what keeps a column from shrinking below a word.
    expect(wrapRules()).toEqual([`${WRAP_RULE} { word-break: normal; }`])
  })

  it('matches its wrap rule to a Typography text in a cell of a wrapping table only', () => {
    // The selector as the browser sees it: `:global()` unwrapped, `.wrap` replaced by the module class.
    const selector = WRAP_RULE.replace(/:global\(([^)]*)\)/, '$1').replace(
      '.wrap',
      `.${styles.wrap ?? ''}`,
    )
    const typographyColumns = [
      {
        title: 'Название',
        dataIndex: 'name',
        key: 'name',
        render: (name: string) => <Typography.Text>{name}</Typography.Text>,
      },
    ]
    const { container, rerender } = render(
      <DataTable<Row> columns={typographyColumns} dataSource={rows} nowrap={false} rowKey="id" />,
    )
    const text = (): Element | null => container.querySelector('.ant-table-tbody .ant-typography')
    expect(text()).not.toBeNull()
    expect(text()?.matches(selector)).toBe(true)
    rerender(<DataTable<Row> columns={typographyColumns} dataSource={rows} rowKey="id" />)
    expect(text()?.matches(selector)).toBe(false)
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
