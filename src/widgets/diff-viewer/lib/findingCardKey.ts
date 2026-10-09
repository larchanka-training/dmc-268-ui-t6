/** Starting or stopping the search changes the key, so every card remounts with its own expanded state. */
export function findingCardKey(findingId: string, searchActive: boolean): string {
  return `${findingId}:${searchActive ? 'q' : ''}`
}
