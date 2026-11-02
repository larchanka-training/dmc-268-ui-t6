import { z } from 'zod'

import { RunStatusSchema, type RunStatus } from '../../../entities/run'

/** The audit journal is limited by repository and status; either may be absent. */
export interface AuditFilter {
  repo?: string
  status?: RunStatus
}

const REPO_PARAM = 'repo'
const STATUS_PARAM = 'status'

// Copied from the runs list: slices of one layer do not import each other, and a value that
// passes here is one `RunListQuerySchema` will send.
const RepoParamSchema = z.string().min(1).max(512)

export function parseAuditFilter(params: URLSearchParams): AuditFilter {
  const repo = RepoParamSchema.safeParse(params.get(REPO_PARAM))
  const status = RunStatusSchema.safeParse(params.get(STATUS_PARAM))
  return {
    ...(repo.success ? { repo: repo.data } : {}),
    ...(status.success ? { status: status.data } : {}),
  }
}

/** Replaces only `repo` and `status`. Every other param is kept. An empty filter removes both. */
export function writeAuditFilter(prev: URLSearchParams, next: AuditFilter): URLSearchParams {
  const params = new URLSearchParams(prev)
  params.delete(REPO_PARAM)
  params.delete(STATUS_PARAM)
  if (next.repo !== undefined && next.repo !== '') {
    params.set(REPO_PARAM, next.repo)
  }
  if (next.status !== undefined) {
    params.set(STATUS_PARAM, next.status)
  }
  return params
}
