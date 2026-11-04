import { useMe, type Workspace } from '../../../entities/user'
import { useWorkspaceStore } from './store'

const NO_WORKSPACES: Workspace[] = []

export interface CurrentWorkspace {
  /** What `GET /api/auth/me` returned; empty until it answers. */
  workspaces: Workspace[]
  /** The picked workspace, or the first available; null only with no workspace at all. */
  current: Workspace | null
  select: (id: string) => void
}

/**
 * The one place that says which workspace is current. Only the picked id is stored: the list stays
 * in the query, so a workspace that is gone stops being current on the next answer. The saved id is
 * left alone then, so an answer that briefly omits a workspace does not lose the choice.
 *
 * `enabled` is passed to `useMe`: callers give `isAuthenticated`, as they do to `useMe`.
 */
export function useCurrentWorkspace(enabled = true): CurrentWorkspace {
  const { data: me } = useMe(enabled)
  const selectedId = useWorkspaceStore((state) => state.selectedId)
  const select = useWorkspaceStore((state) => state.select)
  const workspaces = me?.workspaces ?? NO_WORKSPACES
  const current =
    workspaces.find((workspace) => workspace.id === selectedId) ?? workspaces[0] ?? null
  return { workspaces, current, select }
}
