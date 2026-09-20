import { parseDiff } from 'react-diff-view'
import type { ChangeData, HunkData } from 'react-diff-view'

import type { Chunk, DiffLine, FileDiff, RawFileDiff } from '../model/schemas'
import { FileDiffSchema } from '../model/schemas'

function mapChange(change: ChangeData): DiffLine {
  if (change.type === 'insert') {
    return { type: 'added', oldLine: null, newLine: change.lineNumber, content: change.content }
  }
  if (change.type === 'delete') {
    return { type: 'removed', oldLine: change.lineNumber, newLine: null, content: change.content }
  }
  return {
    type: 'context',
    oldLine: change.oldLineNumber,
    newLine: change.newLineNumber,
    content: change.content,
  }
}

export function chunksFromHunks(hunks: HunkData[]): Chunk[] {
  return hunks.map((hunk) => ({
    header: hunk.content,
    lines: hunk.changes.map(mapChange),
  }))
}

export function fromPatch(raw: RawFileDiff): FileDiff {
  let parsed
  try {
    parsed = parseDiff(raw.patch)
  } catch {
    throw new Error(`unparseable patch for ${raw.filename}`)
  }
  const file = parsed[0]
  if (!file) {
    throw new Error(`unparseable patch for ${raw.filename}`)
  }
  if (file.isBinary) {
    return FileDiffSchema.parse({ filename: raw.filename, chunks: [] })
  }
  return FileDiffSchema.parse({
    filename: raw.filename,
    chunks: chunksFromHunks(file.hunks),
  })
}
