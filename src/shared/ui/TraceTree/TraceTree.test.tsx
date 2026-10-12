// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TraceTree } from './TraceTree'

afterEach(() => {
  cleanup()
})

const treeData = [
  { key: 'a', title: '#0 get_diff', isLeaf: true },
  { key: 'b', title: '#1 post_review', isLeaf: true },
]

describe('TraceTree', () => {
  it('renders the nodes of an Ant Design tree and keeps a class of the caller', () => {
    const { container } = render(<TraceTree className="mine" treeData={treeData} />)
    expect(screen.getByText('#1 post_review')).toBeTruthy()
    const tree = container.querySelector('.ant-tree')
    expect(tree?.classList.contains('mine')).toBe(true)
    expect(tree?.classList.length).toBeGreaterThan(2)
  })

  it('reports a selected node', () => {
    const onSelect = vi.fn()
    render(<TraceTree onSelect={onSelect} treeData={treeData} />)
    screen.getByText('#0 get_diff').click()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0]?.[0]).toEqual(['a'])
  })
})
