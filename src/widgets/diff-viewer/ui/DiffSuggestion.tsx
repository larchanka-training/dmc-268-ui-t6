import type { JSX } from 'react'
import { Diff } from 'react-diff-view'
import 'react-diff-view/style/index.css'
import './diff-theme.css'

import type { DiffLine, FileDiff } from '../../../entities/diff'
import { formatHunkHeader, toHunks } from '../../../entities/diff'
import { useDiffThemeStyle } from '../lib/diffTheme'
import { tokensForHunks } from '../lib/tokensForHunks'

interface DiffSuggestionProps {
  filename: string
  removedLines: string[]
  addedText: string
}

/** One synthetic chunk (removed lines, then added lines, each side numbered from 1) so the suggestion renders through `<Diff>`. */
function suggestionFile(filename: string, removedLines: string[], addedLines: string[]): FileDiff {
  const removed = removedLines.map((content, index): DiffLine => ({
    type: 'removed',
    oldLine: index + 1,
    newLine: null,
    content,
  }))
  const added = addedLines.map((content, index): DiffLine => ({
    type: 'added',
    oldLine: null,
    newLine: index + 1,
    content,
  }))
  return {
    filename,
    hasPatch: true,
    chunks: [
      {
        header: formatHunkHeader({
          oldStart: 1,
          oldLines: removed.length,
          newStart: 1,
          newLines: added.length,
        }),
        lines: [...removed, ...added],
      },
    ],
  }
}

export function DiffSuggestion(props: DiffSuggestionProps): JSX.Element | null {
  const { filename, removedLines, addedText } = props
  const diffTheme = useDiffThemeStyle()
  const addedLines = addedText.length > 0 ? addedText.split('\n') : []
  if (removedLines.length === 0 && addedLines.length === 0) {
    return null
  }

  const hunks = toHunks(suggestionFile(filename, removedLines, addedLines))
  const tokens = tokensForHunks(filename, hunks, {
    diffTotalLines: removedLines.length + addedLines.length,
  })

  return (
    <div
      className={`diff-suggestion ${diffTheme.className}`}
      data-testid="diff-suggestion"
      style={diffTheme.style}
    >
      <Diff diffType="modify" gutterType="none" hunks={hunks} tokens={tokens} viewType="unified" />
    </div>
  )
}
