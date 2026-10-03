import type { ReviewComment } from '../model/schemas'
import type { FindingView } from '../model/schemas'

export function reviewCommentToFinding(comment: ReviewComment): FindingView {
  return {
    id: comment.id,
    file: comment.file,
    oldLine: comment.oldLine === null || comment.oldLine === 0 ? null : comment.oldLine,
    newLine: comment.newLine === null || comment.newLine === 0 ? null : comment.newLine,
    endLine: comment.endLine === null || comment.endLine === 0 ? null : comment.endLine,
    side: 'RIGHT',
    severity: comment.severity,
    category: comment.category,
    title: comment.title,
    body: comment.body,
    suggestion: null,
    confidence: 1,
    ruleName: comment.ruleName,
  }
}
