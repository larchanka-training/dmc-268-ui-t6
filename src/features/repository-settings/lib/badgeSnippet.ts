export function getBadgePath(fullName: string): string {
  return `/api/badges/github/${fullName}.svg`
}

export function buildBadgeSnippet(fullName: string, origin: string): string {
  const path = getBadgePath(fullName)
  return `![Reviewer](${origin}${path})`
}
