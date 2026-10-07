import { useState, type JSX } from 'react'
import { Button, Tag, Typography } from 'antd'

import { extractNewSideLines, type FileDiff } from '../../../entities/diff'
import type { FindingView } from '../../../entities/review'
import {
  findingLineRangeLabel,
  SEVERITY_BADGE_COLOR,
  SEVERITY_BADGE_LABEL,
  severityBadgeGroup,
} from '../../../entities/review'
import { DiffSuggestion } from './DiffSuggestion'

interface InlineCommentProps {
  finding: FindingView
  file?: FileDiff
}

export function InlineComment(props: InlineCommentProps): JSX.Element {
  const { finding, file } = props
  const [expanded, setExpanded] = useState(false)
  const badge = severityBadgeGroup(finding.severity)
  const range = findingLineRangeLabel(finding)

  const removedLines =
    file && finding.newLine !== null
      ? extractNewSideLines(file, finding.newLine, finding.endLine)
      : []

  return (
    <div className="inline-comment" data-testid="inline-comment">
      <Button
        className="inline-comment-header"
        onClick={() => {
          setExpanded((value) => !value)
        }}
        type="text"
      >
        <Tag color={SEVERITY_BADGE_COLOR[badge]}>{SEVERITY_BADGE_LABEL[badge]}</Tag>
        <Typography.Text strong>{finding.title}</Typography.Text>
        {range !== null ? <Typography.Text type="secondary">{range}</Typography.Text> : null}
      </Button>
      {expanded ? (
        <div className="inline-comment-body">
          <Typography.Text type="secondary">{finding.category}</Typography.Text>
          {finding.ruleName !== null ? <Tag color="purple">правило: {finding.ruleName}</Tag> : null}
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {finding.body}
          </Typography.Paragraph>
          {finding.suggestion !== null ? (
            <DiffSuggestion
              addedText={finding.suggestion}
              filename={file?.filename ?? finding.file}
              removedLines={removedLines}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
