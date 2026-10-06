import { tokenize } from 'react-diff-view'
import type { HunkData, HunkTokens } from 'react-diff-view'

import { languageFromFilename } from '../../../entities/diff'
import { refractorForDiffView } from './refractorForDiffView'

/** Above this many diff-side lines, skip sync tokenize to keep the tab responsive (Refs #65). */
export const MAX_LINES_FOR_SYNC_HIGHLIGHT = 3000

export function countDiffSideLines(hunks: HunkData[]): number {
  return hunks.reduce((sum, hunk) => sum + hunk.oldLines + hunk.newLines, 0)
}

export function tokensForHunks(filename: string, hunks: HunkData[]): HunkTokens | undefined {
  const language = languageFromFilename(filename)
  if (language === null || hunks.length === 0) {
    return undefined
  }

  if (countDiffSideLines(hunks) > MAX_LINES_FOR_SYNC_HIGHLIGHT) {
    return undefined
  }

  try {
    return tokenize(hunks, {
      highlight: true,
      refractor: refractorForDiffView,
      language,
    })
  } catch (error: unknown) {
    console.error('tokensForHunks: tokenize failed', { filename, language, error })
    return undefined
  }
}
