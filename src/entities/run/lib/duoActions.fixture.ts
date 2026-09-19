import type { RunAction } from '../model/schemas'

const REPO = 'larchanka-training/dmc-268-ui-t6'
const PR_NUMBER = 34
const SAMPLE_SHA = 'abcdef1234567890abcdef1234567890abcdef12'
const NULL_RESPONSE_BLOB_KS = [3, 6]

export const DUO_ACTION_TOOLS: readonly string[] = [
  'get_pull_request',
  'get_diff',
  ...Array.from({ length: 19 }, () => 'get_tree'),
  ...Array.from({ length: 11 }, () => 'get_blob'),
  'get_pull_request',
  'post_review',
]

function padIndex(index: number): string {
  return String(index).padStart(2, '0')
}

interface ActionPayload {
  request: unknown
  response: unknown
  responseRef: string | null
}

function buildPayload(tool: string, index: number, runId: string): ActionPayload {
  if (tool === 'get_pull_request') {
    return {
      request: { repo: REPO, number: PR_NUMBER },
      response: {
        number: PR_NUMBER,
        title: 'feat: frontend architecture skeleton',
        headSha: SAMPLE_SHA,
        filesChanged: 35,
      },
      responseRef: null,
    }
  }
  if (tool === 'get_diff') {
    return {
      request: { repo: REPO, number: PR_NUMBER },
      response: { files: 2 },
      responseRef: null,
    }
  }
  if (tool === 'get_tree') {
    const k = index - 2
    return {
      request: { repo: REPO, ref: SAMPLE_SHA, path: `src/dir${String(k)}` },
      response: {
        entries: [
          { path: 'a.ts', type: 'blob' },
          { path: 'sub', type: 'tree' },
        ],
      },
      responseRef: null,
    }
  }
  if (tool === 'get_blob') {
    const k = index - 21
    const path = `src/file${String(k)}.ts`
    if (NULL_RESPONSE_BLOB_KS.includes(k)) {
      return {
        request: { path, offset: 0, limit: 200 },
        response: null,
        responseRef: `blob://runs/${runId}/actions/${String(index)}`,
      }
    }
    return {
      request: { path, offset: 0, limit: 200 },
      response: {
        path,
        startLine: 1,
        totalLines: 340,
        nextOffset: 200,
        content: 'file content excerpt',
      },
      responseRef: null,
    }
  }
  return {
    request: { repo: REPO, number: PR_NUMBER, comments: 3 },
    response: { reviewId: 987654 },
    responseRef: null,
  }
}

export function makeDuoActions(
  runId: string,
  firstStartedAt = '2026-09-18T11:50:01.000Z',
): RunAction[] {
  const baseTime = new Date(firstStartedAt).getTime()
  return DUO_ACTION_TOOLS.map((tool, index) => {
    const payload = buildPayload(tool, index, runId)
    return {
      id: `33333333-3333-4333-8333-0000000000${padIndex(index)}`,
      runId,
      index,
      tool,
      request: payload.request,
      response: payload.response,
      responseRef: payload.responseRef,
      startedAt: new Date(baseTime + index * 1000).toISOString(),
      durationMs: 120 + index * 17,
    }
  })
}
