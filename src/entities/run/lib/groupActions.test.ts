import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import type { RunAction } from '../model/schemas'
import { RunActionSchema } from '../model/schemas'
import { DUO_ACTION_TOOLS, makeDuoActions } from './duoActions.fixture'
import { groupActions } from './groupActions'

const RUN_ID = '11111111-1111-4111-8111-000000000000'

function action(index: number, tool: string): RunAction {
  return {
    id: `22222222-2222-4222-8222-0000000000${String(index).padStart(2, '0')}`,
    runId: RUN_ID,
    index,
    tool,
    request: {},
    response: null,
    responseRef: null,
    startedAt: new Date(2026, 0, 1, 0, 0, index).toISOString(),
    durationMs: 10,
  }
}

describe('groupActions', () => {
  it('returns an empty array for no actions', () => {
    expect(groupActions([])).toEqual([])
  })

  it('groups a run of 3+ same-tool actions, keeps shorter runs individual', () => {
    const actions = ['a', 'a', 'b', 'b', 'b', 'a'].map((tool, index) => action(index, tool))
    const nodes = groupActions(actions)
    expect(nodes.map((n) => n.kind)).toEqual(['action', 'action', 'group', 'action'])
    const group = nodes[2]
    if (group?.kind !== 'group') {
      throw new Error('expected node[2] to be a group')
    }
    expect(group.tool).toBe('b')
    expect(group.count).toBe(3)
    expect(group.actions.length).toBe(3)
  })

  it('groups the Duo-shaped 34-action fixture into 6 nodes', () => {
    const actions = makeDuoActions(RUN_ID)
    expect(actions.length).toBe(34)
    expect(z.array(RunActionSchema).safeParse(actions).success).toBe(true)
    expect(DUO_ACTION_TOOLS.length).toBe(34)

    const nodes = groupActions(actions)
    expect(nodes.map((n) => n.kind)).toEqual([
      'action',
      'action',
      'group',
      'group',
      'action',
      'action',
    ])
    const treeNode = nodes[2]
    if (treeNode?.kind !== 'group') {
      throw new Error('expected node[2] to be a group')
    }
    expect(treeNode.tool).toBe('get_tree')
    expect(treeNode.count).toBe(19)

    const blobNode = nodes[3]
    if (blobNode?.kind !== 'group') {
      throw new Error('expected node[3] to be a group')
    }
    expect(blobNode.tool).toBe('get_blob')
    expect(blobNode.count).toBe(11)

    const lastNode = nodes[5]
    if (lastNode?.kind !== 'action') {
      throw new Error('expected node[5] to be an action')
    }
    expect(lastNode.action.tool).toBe('post_review')
  })

  it('honours a custom minGroup', () => {
    const actions = ['a', 'a', 'b'].map((tool, index) => action(index, tool))
    const nodes = groupActions(actions, 2)
    expect(nodes.length).toBe(2)
    expect(nodes[0]).toMatchObject({ kind: 'group', tool: 'a', count: 2 })
    expect(nodes[1]).toMatchObject({ kind: 'action' })
  })

  it('does not group a run shorter than minGroup', () => {
    const actions = ['a', 'a'].map((tool, index) => action(index, tool))
    const nodes = groupActions(actions)
    expect(nodes.map((n) => n.kind)).toEqual(['action', 'action'])
  })
})
