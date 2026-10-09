import type { FindingView, ReviewComment } from '../../../entities/review'
import { reviewCommentToFinding } from '../../../entities/review'

export function mergeFindings(findings: FindingView[], comments: ReviewComment[]): FindingView[] {
  if (comments.length === 0) {
    return findings
  }
  const seen = new Set(findings.map((finding) => finding.id))
  const fromComments = comments
    .map(reviewCommentToFinding)
    .filter((finding) => !seen.has(finding.id))
  return [...findings, ...fromComments]
}
