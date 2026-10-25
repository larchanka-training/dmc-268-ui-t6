/*
 * Names of the /mockups/* pages. Plain data, so the server route and the client code share it.
 * A screen is a whole dashboard page; a snippet is one block of the repository settings page.
 */
export const SCREENS = ['runs', 'run-detail'] as const
export const SNIPPETS = [
  'settings-auto-review',
  'settings-rag',
  'settings-review-options',
  'settings-branches-severity',
  'settings-rules',
] as const

export type ScreenName = (typeof SCREENS)[number]
export type SnippetName = (typeof SNIPPETS)[number]
export type MockName = ScreenName | SnippetName

export const MOCK_NAMES: readonly MockName[] = [...SCREENS, ...SNIPPETS]
