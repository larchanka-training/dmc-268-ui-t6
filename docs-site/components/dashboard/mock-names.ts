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

/** The message a snippet posts to the docs page with its height. */
export const SNIPPET_HEIGHT_MESSAGE = 'rv-snippet-height'

/** The message the docs page posts to a snippet to ask for its height again. */
export const SNIPPET_MEASURE_MESSAGE = 'rv-snippet-measure'
