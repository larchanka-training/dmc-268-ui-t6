import type { RawFileDiff } from '../../entities/diff'
import type { FindingView } from '../../entities/review'
import type { RunDetail, RunSession, Verdict } from '../../entities/run'
import { DEMO_RUN_ID } from '../../shared/config/demoRun'

export const REVIEW_DEMO_RUN_ID = DEMO_RUN_ID
export const REVIEW_SUMMARY_ONLY_RUN_ID = '11111111-1111-4111-8111-000000000008'
export const REVIEW_ATTENTION_RUN_ID = '11111111-1111-4111-8111-000000000009'
export const REVIEW_CLEAN_RUN_ID = '11111111-1111-4111-8111-000000000010'

const REPO = 'larchanka-training/dmc-268-ui-t6'
const NO_SEVERITY_COUNTS = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }

function pullRequestUrl(number: number): string {
  return `https://github.com/${REPO}/pull/${String(number)}`
}

const verdictDemoBase = {
  engine: 'deep' as const,
  model: 'claude-sonnet-5',
  status: 'succeeded' as const,
  startedAt: '2026-09-18T11:50:00.000Z',
  finishedAt: '2026-09-18T11:55:12.000Z',
  attempt: 1,
  cancelRequested: false,
  summaryOnly: false,
  actionCount: 10,
  errorCode: null,
}

export const mockVerdictVariantRuns: RunSession[] = [
  {
    ...verdictDemoBase,
    id: REVIEW_ATTENTION_RUN_ID,
    pullRequest: {
      repo: REPO,
      number: 39,
      title: 'feat: attention verdict demo',
      url: pullRequestUrl(39),
      headSha: 'aaaa9999aaaa9999aaaa9999aaaa9999aaaa9999',
    },
  },
  {
    ...verdictDemoBase,
    id: REVIEW_CLEAN_RUN_ID,
    pullRequest: {
      repo: REPO,
      number: 40,
      title: 'feat: clean verdict demo',
      url: pullRequestUrl(40),
      headSha: 'bbbb0000bbbb0000bbbb0000bbbb0000bbbb0000',
    },
  },
]

function verdictDetail(session: RunSession, verdict: Verdict): RunDetail {
  const counts =
    verdict === 'attention'
      ? { critical: 0, high: 0, medium: 1, low: 1, info: 0 }
      : { critical: 0, high: 0, medium: 0, low: 0, info: 2 }

  return {
    ...session,
    findings: [],
    summary: null,
    verdict,
    severityCounts: counts,
    budget: null,
  }
}

export const mockReviewFindings: FindingView[] = [
  {
    id: '33333333-3333-4333-8333-000000000001',
    file: 'src/a.ts',
    oldLine: null,
    newLine: 2,
    endLine: null,
    side: 'RIGHT',
    severity: 'critical',
    category: 'security',
    title: 'Critical: unsafe pattern',
    body: 'Replace with a safe alternative.',
    suggestion: 'const SAFE = 2',
    confidence: 0.91,
    ruleName: 'unsafe-pattern',
  },
  {
    id: '33333333-3333-4333-8333-000000000002',
    file: 'src/a.ts',
    oldLine: null,
    newLine: 2,
    endLine: null,
    side: 'RIGHT',
    severity: 'high',
    category: 'correctness',
    title: 'High: duplicate concern on line 2',
    body: 'Second finding on the same line.',
    suggestion: null,
    confidence: 0.8,
    ruleName: null,
  },
  {
    id: '33333333-3333-4333-8333-000000000003',
    file: 'src/a.ts',
    oldLine: null,
    newLine: 2,
    endLine: null,
    side: 'RIGHT',
    severity: 'medium',
    category: 'readability',
    title: 'Medium severity sample',
    body: 'This magic number should be extracted.',
    suggestion: null,
    confidence: 0.7,
    ruleName: 'no-magic-numbers',
  },
  {
    id: '33333333-3333-4333-8333-000000000004',
    file: 'src/a.ts',
    oldLine: null,
    newLine: 4,
    endLine: 5,
    side: 'RIGHT',
    severity: 'low',
    category: 'performance',
    title: 'Multiline range finding',
    body: 'Spans lines 4–5 in the new file.',
    suggestion: null,
    confidence: 0.6,
    ruleName: null,
  },
  {
    id: '33333333-3333-4333-8333-000000000005',
    file: 'README.md',
    oldLine: null,
    newLine: 2,
    endLine: null,
    side: 'RIGHT',
    severity: 'info',
    category: 'readability',
    title: 'Docs tone',
    body: 'Consider matching documentation tone.',
    suggestion: null,
    confidence: 0.5,
    ruleName: 'docs-tone',
  },
  {
    id: '33333333-3333-4333-8333-000000000006',
    file: 'src/a.ts',
    oldLine: null,
    newLine: 500,
    endLine: null,
    side: 'RIGHT',
    severity: 'medium',
    category: 'correctness',
    title: 'Outside diff',
    body: 'This line is not in the loaded patch.',
    suggestion: null,
    confidence: 0.4,
    ruleName: null,
  },
  {
    id: '33333333-3333-4333-8333-000000000007',
    file: 'src/a.ts',
    oldLine: null,
    newLine: 3,
    endLine: null,
    side: 'RIGHT',
    severity: 'high',
    category: 'security',
    title: 'XSS probe in body',
    body: '<img src=x onerror=alert(1)>',
    suggestion: '<script>alert(1)</script>',
    confidence: 0.99,
    ruleName: null,
  },
]

export function buildMockRunDetail(session: RunSession): RunDetail {
  if (session.id === REVIEW_SUMMARY_ONLY_RUN_ID) {
    return {
      ...session,
      findings: [],
      summary: null,
      verdict: null,
      severityCounts: { ...NO_SEVERITY_COUNTS },
      budget: null,
    }
  }

  if (session.id === REVIEW_DEMO_RUN_ID) {
    return {
      ...session,
      findings: mockReviewFindings,
      summary: {
        problem: 'Several readability and security findings.',
        doneWell: 'Tests and structure look solid.',
        effort: 'small',
      },
      verdict: 'blocking',
      severityCounts: {
        critical: 1,
        high: 2,
        medium: 2,
        low: 1,
        info: 1,
      },
      budget: {
        tokensIn: 12000,
        tokensOut: 3400,
        costUsd: 0.42,
        tokenLimit: 100000,
        costLimitUsd: 5,
      },
    }
  }

  if (session.id === REVIEW_ATTENTION_RUN_ID) {
    return verdictDetail(session, 'attention')
  }

  if (session.id === REVIEW_CLEAN_RUN_ID) {
    return verdictDetail(session, 'clean')
  }

  return {
    ...session,
    findings: [],
    summary: null,
    verdict: null,
    severityCounts: { ...NO_SEVERITY_COUNTS },
    budget: null,
  }
}

export function mockRawDiffForRun(
  runId: string,
  defaultDiff: RawFileDiff[],
  summaryDiff: RawFileDiff[],
): RawFileDiff[] {
  if (runId === REVIEW_SUMMARY_ONLY_RUN_ID) {
    return summaryDiff
  }
  if (runId === REVIEW_DEMO_RUN_ID) {
    return [...defaultDiff, { filename: 'package.json', patch: null }]
  }
  return defaultDiff
}
