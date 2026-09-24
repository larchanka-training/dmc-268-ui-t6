import type { JSX, ReactElement, ReactNode } from 'react'
import { Segmented, Typography } from 'antd'
import { Decoration, Diff, Hunk } from 'react-diff-view'
import type { HunkData } from 'react-diff-view'
import 'react-diff-view/style/index.css'

import type { FileDiff } from '../../../entities/diff'
import { commentKey, toHunks } from '../../../entities/diff'
import type { ReviewComment } from '../../../entities/review'
import type { DiffViewType } from '../model/store'
import { useDiffViewerStore } from '../model/store'
import type { ContextGap } from '../model/types'
import { InlineComment } from './InlineComment'
import { LoadMoreContext } from './LoadMoreContext'

interface DiffViewerProps {
  file: FileDiff
  comments: ReviewComment[]
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

export function DiffViewer(props: DiffViewerProps): JSX.Element {
  const { file, comments, totalLines, onLoadMore } = props
  const viewType = useDiffViewerStore((s) => s.viewType)
  const setViewType = useDiffViewerStore((s) => s.setViewType)

  if (!file.hasPatch) {
    return <Typography.Text type="secondary">Без диффа</Typography.Text>
  }

  if (file.chunks.length === 0) {
    return <Typography.Text type="secondary">Бинарный файл или пустой дифф</Typography.Text>
  }

  const hunks = toHunks(file)

  const commentsByKey = new Map<string, ReviewComment[]>()
  for (const comment of comments) {
    if (comment.file !== file.filename) {
      continue
    }
    const key = commentKey(comment, file)
    if (key === null) {
      continue
    }
    const list = commentsByKey.get(key)
    if (list === undefined) {
      commentsByKey.set(key, [comment])
    } else {
      list.push(comment)
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
        <InlineComment comment={first} />
      ) : (
        <div>
          {list.map((c) => (
            <InlineComment key={c.id} comment={c} />
          ))}
        </div>
      )
  }

  const renderHunks = (hunksArg: HunkData[]): ReactElement[] => {
    if (!onLoadMore) {
      return hunksArg.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)
    }
    const loadMore = onLoadMore
    const items = hunksArg.flatMap((hunk, i) => {
      const gap = gapBeforeHunk(hunksArg, i)
      const decoration = gap ? [decorationForGap(gap, loadMore)] : []
      return [...decoration, <Hunk key={hunk.content} hunk={hunk} />]
    })
    const trailingGap = gapAfterLastHunk(hunksArg, totalLines)
    return trailingGap ? [...items, decorationForGap(trailingGap, loadMore)] : items
  }

  return (
    <div>
      <div>
        <Typography.Text strong>{file.filename}</Typography.Text>
        <Segmented
          options={VIEW_OPTIONS}
          value={viewType}
          onChange={(value: DiffViewType) => {
            setViewType(value)
          }}
        />
      </div>
      <Diff viewType={viewType} diffType="modify" hunks={hunks} widgets={widgets}>
        {renderHunks}
      </Diff>
    </div>
  )
}
