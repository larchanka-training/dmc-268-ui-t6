import { z } from 'zod'

/** The runs list is limited to one repository; no `repo` means every run. */
export interface RunListFilter {
  repo?: string
}

const REPO_PARAM = 'repo'
const RUNS_PATH = '/runs'

// A URL param is external input: it is checked on its own and a bad one is dropped. The bounds are
// the ones `RunListQuerySchema` puts on `repo`, so a value that passes here always gets sent.
const RepoParamSchema = z.string().min(1).max(512)

export function parseRunListFilter(params: URLSearchParams): RunListFilter {
  const repo = RepoParamSchema.safeParse(params.get(REPO_PARAM))
  return repo.success ? { repo: repo.data } : {}
}

/** Replaces only `repo`; every other param is kept. An empty filter removes it. */
export function writeRunListFilter(prev: URLSearchParams, next: RunListFilter): URLSearchParams {
  const params = new URLSearchParams(prev)
  params.delete(REPO_PARAM)
  if (next.repo !== undefined && next.repo !== '') {
    params.set(REPO_PARAM, next.repo)
  }
  return params
}

/** Link to the runs list with the filter applied. */
export function runListHref(filter: RunListFilter): string {
  const search = writeRunListFilter(new URLSearchParams(), filter).toString()
  return search === '' ? RUNS_PATH : `${RUNS_PATH}?${search}`
}
