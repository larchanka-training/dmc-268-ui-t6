/** Max lines per `GET /runs/{id}/files` request when loading diff context (Refs #65). */
export const MAX_CONTEXT_CHUNK_LINES = 500

export function contextChunkLimit(gapCount: number): number {
  return Math.min(gapCount, MAX_CONTEXT_CHUNK_LINES)
}
