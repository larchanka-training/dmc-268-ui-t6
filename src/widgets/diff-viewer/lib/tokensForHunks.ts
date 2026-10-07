import { tokenize } from 'react-diff-view'
import type { HunkData, HunkTokens } from 'react-diff-view'

import { languageFromFilename } from '../../../entities/diff'
import { refractorForDiffView } from './refractorForDiffView'

/**
 * Sync highlight budget (Refs #65, AC 1.5): per-file and total across the diff view.
 * Chosen ~1000 lines (~0.4s tokenize in Vitest/Node); API `summary_only` still applies above 3000.
 */
export const MAX_LINES_FOR_SYNC_HIGHLIGHT = 1000
export const MAX_SYNC_HIGHLIGHT_TOTAL_LINES = 1000

export function countDiffSideLines(hunks: HunkData[]): number {
  return hunks.reduce((sum, hunk) => sum + hunk.oldLines + hunk.newLines, 0)
}

export function tokensForHunks(
  filename: string,
  hunks: HunkData[],
  options?: { diffTotalLines?: number },
): HunkTokens | undefined {
  const language = languageFromFilename(filename)
  if (language === null || hunks.length === 0) {
    return undefined
  }

  const totalBudget = options?.diffTotalLines
  if (totalBudget !== undefined && totalBudget > MAX_SYNC_HIGHLIGHT_TOTAL_LINES) {
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
