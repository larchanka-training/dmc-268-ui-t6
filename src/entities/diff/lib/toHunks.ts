import type { ChangeData, HunkData } from 'react-diff-view'

import type { Chunk, DiffLine, FileDiff } from '../model/schemas'

const HEADER_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))?/

function parseHeaderStarts(header: string): { oldStart: number; newStart: number } {
  const match = HEADER_RE.exec(header)
  if (!match) {
    return { oldStart: 0, newStart: 0 }
  }
  const [, oldStart, , newStart] = match
  return {
    oldStart: oldStart !== undefined ? Number(oldStart) : 0,
    newStart: newStart !== undefined ? Number(newStart) : 0,
  }
}

function toChange(line: DiffLine): ChangeData {
  if (line.type === 'added') {
    const lineNumber = line.newLine
    if (lineNumber === null) {
      throw new Error('added line missing newLine')
    }
    return { type: 'insert', isInsert: true, lineNumber, content: line.content }
  }
  if (line.type === 'removed') {
    const lineNumber = line.oldLine
    if (lineNumber === null) {
      throw new Error('removed line missing oldLine')
    }
    return { type: 'delete', isDelete: true, lineNumber, content: line.content }
  }
  const oldLineNumber = line.oldLine
  const newLineNumber = line.newLine
  if (oldLineNumber === null || newLineNumber === null) {
    throw new Error('context line missing oldLine/newLine')
  }
  return { type: 'normal', isNormal: true, oldLineNumber, newLineNumber, content: line.content }
}

function chunkToHunk(chunk: Chunk): HunkData {
  const withOldLine = chunk.lines.find((line) => line.oldLine !== null)
  const withNewLine = chunk.lines.find((line) => line.newLine !== null)
  const fallback = parseHeaderStarts(chunk.header)
  const oldStart = withOldLine?.oldLine ?? fallback.oldStart
  const newStart = withNewLine?.newLine ?? fallback.newStart
  const oldLines = chunk.lines.filter((line) => line.oldLine !== null).length
  const newLines = chunk.lines.filter((line) => line.newLine !== null).length
  return {
    content: chunk.header,
    oldStart,
    newStart,
    oldLines,
    newLines,
    changes: chunk.lines.map(toChange),
  }
}

export function toHunks(file: FileDiff): HunkData[] {
  return file.chunks.map(chunkToHunk)
}
