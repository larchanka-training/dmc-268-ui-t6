import type { FindingView } from '../model/schemas'

export function findingAnchorLine(finding: FindingView): {
  oldLine: number | null
  newLine: number | null
  endLine: number | null
} {
  if (finding.newLine !== null) {
    return {
      oldLine: null,
      newLine: finding.newLine,
      endLine: finding.endLine ?? finding.newLine,
    }
  }
  return {
    oldLine: finding.oldLine,
    newLine: null,
    endLine: finding.endLine,
  }
}

export function findingLineRangeLabel(finding: FindingView): string | null {
  const anchor = findingAnchorLine(finding)
  if (anchor.newLine !== null) {
    const end = anchor.endLine ?? anchor.newLine
    return end === anchor.newLine ? `L${String(anchor.newLine)}` : `L${String(anchor.newLine)}–${String(end)}`
  }
  if (anchor.oldLine !== null) {
    return `L${String(anchor.oldLine)} (old)`
  }
  return null
}
