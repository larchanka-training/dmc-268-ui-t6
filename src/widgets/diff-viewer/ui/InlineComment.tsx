import { useState, type JSX } from 'react'
import { Typography } from 'antd'

import { extractNewSideLines, type FileDiff } from '../../../entities/diff'
import type { FindingView, Severity } from '../../../entities/review'
import { findingLineRangeLabel, SEVERITY_LABEL } from '../../../entities/review'
import { RowButton, Tag, type TagProps } from '../../../shared/ui'
import { DiffSuggestion } from './DiffSuggestion'

/** Each finding keeps its exact severity; only critical is filled (UI #127). */
const SEVERITY_TAG = {
  critical: { tone: 'critical', variant: 'solid' },
  high: { tone: 'critical', variant: 'dot' },
  medium: { tone: 'high', variant: 'dot' },
  low: { tone: 'warning', variant: 'dot' },
  info: { tone: 'info', variant: 'dot' },
} as const satisfies Record<Severity, Pick<TagProps, 'tone' | 'variant'>>

interface InlineCommentProps {
  finding: FindingView
  file?: FileDiff
  /** Initial state only; changing it later does not re-expand (the caller remounts via `key`). */
  defaultExpanded?: boolean
}

export function InlineComment(props: InlineCommentProps): JSX.Element {
  const { finding, file, defaultExpanded = false } = props
  const [expanded, setExpanded] = useState(defaultExpanded)
  const badge = SEVERITY_TAG[finding.severity]
  const range = findingLineRangeLabel(finding)

  const removedLines =
    file && finding.newLine !== null
      ? extractNewSideLines(file, finding.newLine, finding.endLine)
      : []

  return (
    <div className="inline-comment" data-testid="inline-comment">
      <RowButton
        aria-expanded={expanded}
        className="inline-comment-row"
        onClick={() => {
          setExpanded((value) => !value)
        }}
      >
        <Tag tone={badge.tone} variant={badge.variant}>
          {SEVERITY_LABEL[finding.severity]}
        </Tag>
        <Typography.Text className="inline-comment-title" strong>
          {finding.title}
        </Typography.Text>
        {range !== null ? (
          <Typography.Text className="inline-comment-range" type="secondary">
            {range}
          </Typography.Text>
        ) : null}
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
