import type { FileDiff } from '../model/schemas'

interface CommentTarget {
  oldLine: number | null
  newLine: number | null
}

export function commentKey(target: CommentTarget, file: FileDiff): string | null {
  const lines = file.chunks.flatMap((chunk) => chunk.lines)
  if (target.newLine !== null) {
    const line = lines.find((l) => l.newLine === target.newLine)
    if (line?.type === 'added') {
      return `I${String(target.newLine)}`
    }
    if (line?.type === 'context' && line.oldLine !== null) {
      return `N${String(line.oldLine)}`
    }
    return null
  }
  if (target.oldLine !== null) {
    const line = lines.find((l) => l.oldLine === target.oldLine)
    if (line?.type === 'removed') {
      return `D${String(target.oldLine)}`
    }
    if (line?.type === 'context' && line.oldLine !== null) {
      return `N${String(line.oldLine)}`
    }
    return null
  }
  return null
}
