import { useState, type JSX } from 'react'
import { Typography } from 'antd'

import { extractNewSideLines, type FileDiff } from '../../../entities/diff'
import type { FindingView } from '../../../entities/review'
import {
  findingLineRangeLabel,
  SEVERITY_BADGE_LABEL,
  severityBadgeGroup,
} from '../../../entities/review'
import { RowButton, Tag } from '../../../shared/ui'
import { DiffSuggestion } from './DiffSuggestion'

/** Only the critical group is filled: it is the one that needs action (docs/DESIGN_SYSTEM.md §8). */
const SEVERITY_TAG = {
  critical: { tone: 'critical', variant: 'solid' },
  warning: { tone: 'warning', variant: 'dot' },
  info: { tone: 'info', variant: 'dot' },
} as const

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
      <RowButton
        aria-expanded={expanded}
        className="inline-comment-header"
        onClick={() => {
          setExpanded((value) => !value)
        }}
      >
        <Tag tone={SEVERITY_TAG[badge].tone} variant={SEVERITY_TAG[badge].variant}>
          {SEVERITY_BADGE_LABEL[badge]}
        </Tag>
        <Typography.Text strong>{finding.title}</Typography.Text>
        {range !== null ? <Typography.Text type="secondary">{range}</Typography.Text> : null}
      </RowButton>
      {expanded ? (
        <div className="inline-comment-body">
          <Typography.Text type="secondary">{finding.category}</Typography.Text>
          {finding.ruleName !== null ? (
            <Tag variant="outline">правило: {finding.ruleName}</Tag>
          ) : null}
          <Typography.Paragraph className="inline-comment-text">
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
