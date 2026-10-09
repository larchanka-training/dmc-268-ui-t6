import { describe, expect, it } from 'vitest'

// No @types/node here: load `fs` untyped to read the real entry file.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string
}

const source = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8')

// `startMockRunEvents()` is the only thing that moves the mock run's status on the page (the SSE
// stream is not opened on mocks), and nothing else calls it: this reads the text of the entry file,
// as `zodJitless.test.ts` does, because the behaviour needs a browser entry point to run.
describe('main.tsx mock wiring', () => {
  it('takes initMockTransport and startMockRunEvents from the one mockTransport import', () => {
    expect(source).toMatch(
      /const \{[^}]*\binitMockTransport\b[^}]*\} = await import\('\.\/app\/mocks\/mockTransport'\)/,
    )
    expect(source).toMatch(
      /const \{[^}]*\bstartMockRunEvents\b[^}]*\} = await import\('\.\/app\/mocks\/mockTransport'\)/,
    )
  })

  it('calls startMockRunEvents() right after initMockTransport(), in the mock guard', () => {
    expect(source).toMatch(
      /if \(__VITE_MOCKS_BUILD__ \|\| isMockMode\(\)\) \{\s*const \{[^}]*\} = await import\('\.\/app\/mocks\/mockTransport'\)\s*initMockTransport\(\)\s*startMockRunEvents\(\)\s*\}/,
    )
  })

  it('does so before the app is rendered', () => {
    const started = source.indexOf('startMockRunEvents()')
    const rendered = source.indexOf('ReactDOM.createRoot')
    expect(started).toBeGreaterThan(-1)
    expect(rendered).toBeGreaterThan(started)
  })

  it('keeps the mock code behind the build and dev switch', () => {
    expect(source).toMatch(
      /if \(__VITE_MOCKS_BUILD__ \|\| import\.meta\.env\.DEV\) \{\s*if \(__VITE_MOCKS_BUILD__ \|\| isMockMode\(\)\) \{/,
    )
  })
})
