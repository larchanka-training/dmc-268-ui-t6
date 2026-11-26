/** A CSS pixel box. The glass ceiling is the union of these. */
export interface CeilingBox {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Hard ceiling past the union, in CSS pixels. A line box can end a couple of pixels
 * beyond the element that holds it, and a sampled pixel can sit on that edge (#313).
 */
export const FORM_EDGE_PX = 2

export function unionRects(rects: readonly CeilingBox[]): CeilingBox | null {
  const first = rects[0]
  if (!first) return null
  let left = first.left
  let top = first.top
  let right = first.right
  let bottom = first.bottom
  for (const rect of rects) {
    left = Math.min(left, rect.left)
    top = Math.min(top, rect.top)
    right = Math.max(right, rect.right)
    bottom = Math.max(bottom, rect.bottom)
  }
  return { left, top, right, bottom }
}

/** True when the pixel is under the hard brightness ceiling (weight 1, cap at most SAFE). */
export function insideCeiling(px: { x: number; y: number }, union: CeilingBox): boolean {
  return (
    px.x >= union.left - FORM_EDGE_PX &&
    px.x <= union.right + FORM_EDGE_PX &&
    px.y >= union.top - FORM_EDGE_PX &&
    px.y <= union.bottom + FORM_EDGE_PX
  )
}
