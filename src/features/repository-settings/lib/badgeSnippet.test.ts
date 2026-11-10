import { describe, expect, it } from 'vitest'

import { buildBadgeSnippet, getBadgePath } from './badgeSnippet'

describe('badgeSnippet', () => {
  it('getBadgePath extracts owner and repo', () => {
    expect(getBadgePath('owner/repo')).toBe('/api/badges/github/owner/repo.svg')
    expect(getBadgePath('octo-org/hello.world')).toBe('/api/badges/github/octo-org/hello.world.svg')
  })

  it('buildBadgeSnippet formats Markdown image with absolute URL', () => {
    const snippet = buildBadgeSnippet('owner/repo', 'https://example.com')
    expect(snippet).toBe('![Reviewer](https://example.com/api/badges/github/owner/repo.svg)')
  })
})
