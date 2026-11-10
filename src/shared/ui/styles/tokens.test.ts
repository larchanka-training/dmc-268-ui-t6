import { describe, expect, it } from 'vitest'

// No @types/node here: load `fs` untyped to read the real stylesheets.
const FS_MODULE = 'node:fs'
const { readFileSync, readdirSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
  readdirSync: (path: string, options: { recursive: true; encoding: 'utf8' }) => string[]
}

const TOKENS = readFileSync('src/shared/ui/styles/tokens.css', 'utf8')

/** Every stylesheet of the screens: pages, widgets, features and the app shell. */
function screenStylesheets(): string[] {
  return ['src/app', 'src/pages', 'src/widgets', 'src/features'].flatMap((dir) =>
    readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.css'))
      .map((file) => `${dir}/${file}`),
  )
}

describe('tokens.css: radius scale', () => {
  it('names the 999px radius of tags, so no stylesheet writes it as a number (DS §5, #239 D10)', () => {
    expect(TOKENS).toMatch(/^ {2}--rv-radius-full: 999px;$/m)
    for (const path of [
      'src/shared/ui/Tag/Tag.module.css',
      'src/pages/analytics/ui/FindingsByDay.module.css',
    ]) {
      const css = readFileSync(path, 'utf8')
      expect(css, path).toContain('border-radius: var(--rv-radius-full);')
      expect(css, path).not.toContain('999px')
    }
  })

  it('leaves no radius written as a number in the stylesheets of the screens (DS §1)', () => {
    const files = screenStylesheets()
    expect(files.length).toBeGreaterThan(10)
    for (const path of files) {
      // The longhands too (`border-top-left-radius: 3px`), and `.5rem` or a space before the colon.
      expect(readFileSync(path, 'utf8'), path).not.toMatch(/border-[a-z-]*radius\s*:\s*[\d.]/)
    }
  })
})
