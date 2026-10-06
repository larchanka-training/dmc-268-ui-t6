import type { JSX, ReactElement, ReactNode } from 'react'
import { Alert, Segmented, Typography } from 'antd'
import { Decoration, Diff, Hunk } from 'react-diff-view'
import type { HunkData } from 'react-diff-view'
import 'react-diff-view/style/index.css'

import type { FileDiff } from '../../../entities/diff'
import { commentKey, toHunks } from '../../../entities/diff'
import type { FindingView, ReviewComment } from '../../../entities/review'
import { reviewCommentToFinding } from '../../../entities/review/lib/reviewCommentToFinding'
import { tokensForHunks } from '../lib/tokensForHunks'
import type { DiffViewType } from '../model/store'
import { useDiffViewerStore } from '../model/store'
import type { ContextGap } from '../model/types'
import { InlineComment } from './InlineComment'
import { LoadMoreContext } from './LoadMoreContext'

interface DiffViewerProps {
  file: FileDiff
  findings?: FindingView[]
  comments?: ReviewComment[]
  totalLines?: number
  onLoadMore?: (gap: ContextGap) => void
}

const VIEW_OPTIONS = [
  { label: 'Unified', value: 'unified' as const },
  { label: 'Split', value: 'split' as const },
]

function gapBeforeHunk(hunks: HunkData[], index: number): ContextGap | null {
  const hunk = hunks[index]
  if (hunk === undefined) {
    return null
  }
  if (index === 0) {
    return hunk.newStart > 1 ? { startLine: 1, count: hunk.newStart - 1 } : null
  }
  const prev = hunks[index - 1]
  if (prev === undefined) {
    return null
  }
  const startLine = prev.newStart + prev.newLines
  const count = hunk.newStart - startLine
  return count > 0 ? { startLine, count } : null
}

function gapAfterLastHunk(hunks: HunkData[], totalLines: number | undefined): ContextGap | null {
  if (totalLines === undefined) {
    return null
  }
  const last = hunks[hunks.length - 1]
  if (last === undefined) {
    return null
  }
  const startLine = last.newStart + last.newLines
  if (startLine > totalLines) {
    return null
  }
  return { startLine, count: totalLines - startLine + 1 }
}

function decorationForGap(gap: ContextGap, onLoadMore: (gap: ContextGap) => void): ReactElement {
  return (
    <Decoration key={`gap-${String(gap.startLine)}`}>
      <LoadMoreContext gap={gap} onLoadMore={onLoadMore} />
    </Decoration>
  )
}

function mergeFindings(findings: FindingView[], comments: ReviewComment[]): FindingView[] {
  if (comments.length === 0) {
    return findings
  }
  const seen = new Set(findings.map((finding) => finding.id))
  const fromComments = comments
    .map(reviewCommentToFinding)
    .filter((finding) => !seen.has(finding.id))
  return [...findings, ...fromComments]
}

export function DiffViewer(props: DiffViewerProps): JSX.Element {
  const { file, findings = [], comments = [], totalLines, onLoadMore } = props
  const viewType = useDiffViewerStore((s) => s.viewType)
  const setViewType = useDiffViewerStore((s) => s.setViewType)

  if (!file.hasPatch) {
    return (
      <div>
        <Typography.Text strong>{file.filename}</Typography.Text>
        <Typography.Text type="secondary">Без диффа</Typography.Text>
      </div>
    )
  }

  if (file.chunks.length === 0) {
    return (
      <div>
        <Typography.Text strong>{file.filename}</Typography.Text>
        <Typography.Text type="secondary">Бинарный файл или пустой дифф</Typography.Text>
      </div>
    )
  }

  const hunks = toHunks(file)
  const fileFindings = mergeFindings(findings, comments).filter((f) => f.file === file.filename)

  const outOfDiff: FindingView[] = []
  const commentsByKey = new Map<string, FindingView[]>()

  for (const finding of fileFindings) {
    const key = commentKey(
      { oldLine: finding.oldLine, newLine: finding.newLine, endLine: finding.endLine },
      file,
    )
    if (key === null) {
      outOfDiff.push(finding)
      continue
    }
    const list = commentsByKey.get(key)
    if (list === undefined) {
      commentsByKey.set(key, [finding])
    } else {
      list.push(finding)
    }
  }

  const widgets: Record<string, ReactNode> = {}
  for (const [key, list] of commentsByKey) {
    const [first] = list
    if (first === undefined) {
      continue
    }
    widgets[key] =
      list.length === 1 ? (
        <InlineComment file={file} finding={first} />
      ) : (
        <div>
          {list.map((finding) => (
            <InlineComment file={file} finding={finding} key={finding.id} />
          ))}
        </div>
      )
  }

  const tokens = tokensForHunks(file.filename, hunks)

  const renderHunks = (hunksArg: HunkData[]): ReactElement[] => {
    if (!onLoadMore) {
      return hunksArg.map((hunk) => <Hunk hunk={hunk} key={hunk.content} />)
    }
    const loadMore = onLoadMore
    const items = hunksArg.flatMap((hunk, i) => {
      const gap = gapBeforeHunk(hunksArg, i)
      const decoration = gap ? [decorationForGap(gap, loadMore)] : []
      return [...decoration, <Hunk hunk={hunk} key={hunk.content} />]
    })
    const trailingGap = gapAfterLastHunk(hunksArg, totalLines)
    return trailingGap ? [...items, decorationForGap(trailingGap, loadMore)] : items
  }

  return (
    <div>
      <div>
        <Typography.Text strong>{file.filename}</Typography.Text>
        <Segmented
          onChange={(value: DiffViewType) => {
            setViewType(value)
          }}
          options={VIEW_OPTIONS}
          value={viewType}
        />
      </div>
      <Diff diffType="modify" hunks={hunks} tokens={tokens} viewType={viewType} widgets={widgets}>
        {renderHunks}
      </Diff>
      {outOfDiff.length > 0 ? (
        <Alert
          data-testid="findings-outside-diff"
          description={
            <div>
              {outOfDiff.map((finding) => (
                <InlineComment file={file} finding={finding} key={finding.id} />
              ))}
            </div>
          }
          style={{ marginTop: 12 }}
          title="Замечания вне диффа"
          type="warning"
        />
      ) : null}
    </div>
  )
}
