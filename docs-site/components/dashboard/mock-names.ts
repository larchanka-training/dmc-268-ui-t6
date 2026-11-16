/*
 * Single source of truth for /mockups/* pages and screenshot specs. Uses erasable TypeScript so
 * Next.js, tsc, and `node scripts/shoot-mockups.mjs` all consume it directly.
 * A screen is a whole dashboard page; a snippet is one block of the repository settings page.
 */
export const SCREEN_SPECS = [
  { name: 'runs', width: 1280, height: 712 },
  { name: 'run-detail', width: 1280, height: 1120 },
] as const

export const SNIPPET_SPECS = [
  { name: 'settings-auto-review', width: 560 },
  { name: 'settings-rag', width: 560 },
  { name: 'settings-review-options', width: 560 },
  { name: 'settings-branches-severity', width: 560 },
  { name: 'settings-rules', width: 640 },
] as const

export type ScreenName = (typeof SCREEN_SPECS)[number]['name']
export type SnippetName = (typeof SNIPPET_SPECS)[number]['name']
export type MockName = ScreenName | SnippetName

export interface MockShotSpec {
  readonly name: MockName
  readonly width: number
  readonly height?: number
}

export const SCREENS: readonly ScreenName[] = SCREEN_SPECS.map((item) => item.name)
export const SNIPPETS: readonly SnippetName[] = SNIPPET_SPECS.map((item) => item.name)
export const MOCK_NAMES: readonly MockName[] = [...SCREENS, ...SNIPPETS]
export const MOCK_SHOTS: readonly MockShotSpec[] = [...SCREEN_SPECS, ...SNIPPET_SPECS]
