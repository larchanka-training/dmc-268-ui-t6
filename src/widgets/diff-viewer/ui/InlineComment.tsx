import type { JSX } from 'react'
import { Tag, Typography } from 'antd'

import type { ReviewComment, Severity } from '../../../entities/review'

interface InlineCommentProps {
  comment: ReviewComment
}

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: 'red',
  high: 'volcano',
  medium: 'orange',
  low: 'gold',
  info: 'blue',
}

export function InlineComment(props: InlineCommentProps): JSX.Element {
  const { comment } = props
  return (
    <div className="inline-comment">
      <Tag color={SEVERITY_COLOR[comment.severity]}>{comment.severity}</Tag>
      <Tag>{comment.category}</Tag>
      {comment.ruleName !== null ? <Tag color="purple">правило: {comment.ruleName}</Tag> : null}
      <Typography.Text strong>{comment.title}</Typography.Text>
      <Typography.Paragraph>{comment.body}</Typography.Paragraph>
    </div>
  )
}
