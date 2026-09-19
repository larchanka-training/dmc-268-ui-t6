import type { RunAction } from '../model/schemas'

export type ActionTreeNode =
  | { kind: 'action'; action: RunAction }
  | { kind: 'group'; tool: string; count: number; actions: RunAction[] }

export const MIN_GROUP_SIZE = 3

export function groupActions(actions: RunAction[], minGroup = MIN_GROUP_SIZE): ActionTreeNode[] {
  // A "group" of 1 action is meaningless, so clamp the caller-supplied minGroup to at least 2.
  const threshold = Math.max(2, minGroup)
  const nodes: ActionTreeNode[] = []
  let index = 0
  while (index < actions.length) {
    const current = actions[index]
    if (current === undefined) {
      break
    }
    let end = index + 1
    while (end < actions.length && actions[end]?.tool === current.tool) {
      end += 1
    }
    const run = actions.slice(index, end)
    if (run.length >= threshold) {
      nodes.push({ kind: 'group', tool: current.tool, count: run.length, actions: run })
    } else {
      for (const action of run) {
        nodes.push({ kind: 'action', action })
      }
    }
    index = end
  }
  return nodes
}
