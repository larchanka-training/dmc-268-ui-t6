import { insertHunk, textLinesToHunk } from 'react-diff-view'
import type { HunkData } from 'react-diff-view'

import type { FileDiff, FileSlice } from '../model/schemas'
import { FileDiffSchema } from '../model/schemas'
import { chunksFromHunks } from './fromPatch'
import { toHunks } from './toHunks'

export function formatHunkHeader(h: {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
}): string {
  return `@@ -${String(h.oldStart)},${String(h.oldLines)} +${String(h.newStart)},${String(h.newLines)} @@`
}

function resolveOldStart(hunks: HunkData[], slice: FileSlice): number {
  const priorHunks = hunks.filter((h) => h.newStart + h.newLines <= slice.startLine)
  const priorHunk = priorHunks[priorHunks.length - 1]
  if (priorHunk !== undefined) {
    const offset =
      priorHunk.oldStart + priorHunk.oldLines - (priorHunk.newStart + priorHunk.newLines)
    return slice.startLine + offset
  }
  const firstHunk = hunks[0]
  if (firstHunk === undefined) {
    throw new Error('expandContext: file has no hunks')
  }
  const offset = firstHunk.oldStart - firstHunk.newStart
  return slice.startLine + offset
}

export function expandContext(file: FileDiff, slice: FileSlice): FileDiff {
  const hunks = toHunks(file)
  const oldStart = resolveOldStart(hunks, slice)
  const ctxHunk = textLinesToHunk(slice.lines, oldStart, slice.startLine)
  if (ctxHunk === null) {
    throw new Error(`expandContext: could not build context hunk for ${file.filename}`)
  }
  const merged = insertHunk(hunks, ctxHunk).map((h) => ({
    ...h,
    content: formatHunkHeader(h),
  }))
  return FileDiffSchema.parse({
    filename: file.filename,
    chunks: chunksFromHunks(merged),
    hasPatch: true,
  })
}
