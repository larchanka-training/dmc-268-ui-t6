export function getBadgePath(fullName: string): string {
  const parts = fullName.split('/')
  const owner = parts[0] ?? ''
  const repo = parts.slice(1).join('/')
  return `/api/badges/github/${owner}/${repo}.svg`
}

export function buildBadgeSnippet(fullName: string, origin: string): string {
  const path = getBadgePath(fullName)
  return `![Reviewer](${origin}${path})`
}
