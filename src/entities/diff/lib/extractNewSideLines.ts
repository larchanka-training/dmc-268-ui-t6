import type { FileDiff } from '../model/schemas'

export function extractNewSideLines(
  file: FileDiff,
  startLine: number,
  endLine: number | null,
): string[] {
  const last = endLine ?? startLine
  const lines = file.chunks
    .flatMap((chunk) => chunk.lines)
    .filter((line) => line.newLine !== null && line.newLine >= startLine && line.newLine <= last)
    .sort((a, b) => (a.newLine ?? 0) - (b.newLine ?? 0))

  const expectedCount = last - startLine + 1
  if (lines.length === 0 || lines.length < expectedCount) {
    return []
  }

  return lines.map((line) => line.content)
}
