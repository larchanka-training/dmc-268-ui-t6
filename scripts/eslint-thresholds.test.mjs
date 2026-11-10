// @vitest-environment node
// ui#175: the complexity limits of the repo's own eslint config (the api thresholds), checked
// through the computed rules for a path, not through the config text.
import { ESLint, Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

const root = new URL('..', import.meta.url).pathname
const eslint = new ESLint({ cwd: root })
const RULES = ['complexity', 'max-params', 'max-lines-per-function']

async function lint(code, filePath) {
  const computed = await eslint.calculateConfigForFile(filePath)
  const rules = Object.fromEntries(RULES.map((name) => [name, computed.rules?.[name] ?? 'off']))
  const messages = new Linter().verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules,
      },
    ],
    filePath,
  )
  return messages.filter((m) => RULES.includes(m.ruleId ?? ''))
}

const ids = (messages) => messages.map((m) => m.ruleId)
const src = `${root}src/shared/lib/example.ts`
const srcTest = `${root}src/shared/lib/example.test.tsx`

/** A function with cyclomatic complexity `n` (1 + n - 1 branches). */
function withComplexity(n) {
  const branches = Array.from({ length: n - 1 }, (_, i) => `  if (x === ${i}) return ${i}`)
  return `export function f(x: number): number {\n${branches.join('\n')}\n  return -1\n}\n`
}

/** A function of exactly `n` code lines, the `function` and `}` lines included. */
function withCodeLines(n) {
  const body = Array.from({ length: n - 3 }, (_, i) => `  const v${i} = ${i}`)
  return `export function f(): number {\n${body.join('\n')}\n  return 0\n}\n`
}

describe('eslint complexity limits (ui#175)', () => {
  it('reports cyclomatic complexity 11 and accepts 10', async () => {
    expect(ids(await lint(withComplexity(11), src))).toEqual(['complexity'])
    expect(await lint(withComplexity(10), src)).toEqual([])
  })

  it('reports 6 parameters and accepts 5', async () => {
    const six = 'export function f(a: 1, b: 2, c: 3, d: 4, e: 5, g: 6): void {}\n'
    const five = 'export function f(a: 1, b: 2, c: 3, d: 4, e: 5): void {}\n'
    expect(ids(await lint(six, src))).toEqual(['max-params'])
    expect(await lint(five, src)).toEqual([])
  })

  it('reports 51 code lines and accepts 50 with blank lines and comments', async () => {
    expect(ids(await lint(withCodeLines(51), src))).toEqual(['max-lines-per-function'])
    const fifty = withCodeLines(50)
      .split('\n')
      .flatMap((line, i) => (i > 0 && i % 5 === 0 ? ['', '  // a comment', line] : [line]))
      .join('\n')
    expect(await lint(fifty, src)).toEqual([])
  })

  it('does not apply max-lines-per-function to a test file, but still applies complexity', async () => {
    const describeCallback = `describe('x', () => {\n${Array.from(
      { length: 58 },
      (_, i) => `  const v${i} = ${i}`,
    ).join('\n')}\n})\n`
    expect(await lint(describeCallback, srcTest)).toEqual([])
    expect(ids(await lint(withComplexity(11), srcTest))).toEqual(['complexity'])
  })
})
