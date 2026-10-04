import { refractor as baseRefractor } from 'refractor'
import tsx from 'refractor/tsx'

/** Minimal HAST nodes for react-diff-view `createRoot` (no `hast` package). */
export interface HastTextNode {
  type: 'text'
  value: string
}
export interface HastElementNode {
  type: 'element'
  tagName: string
  properties?: Record<string, unknown>
  children?: HastChild[]
}
export type HastChild = HastElementNode | HastTextNode

function isHastRoot(tree: unknown): tree is { type: 'root'; children: HastChild[] } {
  return (
    typeof tree === 'object' &&
    tree !== null &&
    'type' in tree &&
    tree.type === 'root' &&
    'children' in tree &&
    Array.isArray((tree as { children: unknown }).children)
  )
}

/**
 * react-diff-view 3.x passes `refractor.highlight()` into `createRoot(children)` and
 * expects an array of HAST nodes. refractor 5 returns a `root` element instead (Refs #65).
 */
function highlightAsChildren(value: string, language: string): HastChild[] {
  const tree: unknown = baseRefractor.highlight(value, language)
  if (Array.isArray(tree)) {
    return tree as HastChild[]
  }
  if (isHastRoot(tree)) {
    return tree.children
  }
  return [{ type: 'text', value }]
}

baseRefractor.register(tsx)

export const refractorForDiffView = {
  highlight(value: string, language: string): HastChild[] {
    return highlightAsChildren(value, language)
  },
}
