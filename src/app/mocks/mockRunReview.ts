import type { RawFileDiff } from '../../entities/diff'
import type { FindingView } from '../../entities/review'
import type { RunDetail, RunSession } from '../../entities/run'

export const REVIEW_DEMO_RUN_ID = '11111111-1111-4111-8111-000000000004'
export const REVIEW_LEGACY_RUN_ID = '11111111-1111-4111-8111-000000000002'
export const REVIEW_SUMMARY_ONLY_RUN_ID = '11111111-1111-4111-8111-000000000008'

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
  if (session.id === REVIEW_LEGACY_RUN_ID) {
    return {
      ...session,
      findings: [],
      summary: null,
      verdict: null,
      severityCounts: null,
      budget: null,
    }
  }

  if (session.id === REVIEW_SUMMARY_ONLY_RUN_ID) {
    return {
      ...session,
      findings: [],
      summary: null,
      verdict: null,
      severityCounts: null,
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

  return {
    ...session,
    findings: [],
    summary: null,
    verdict: null,
    severityCounts: null,
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

export function mockLegacyRunSessionPayload(session: RunSession): RunSession {
  return session
}
