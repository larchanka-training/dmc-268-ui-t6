import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import './zodJitless'

// No @types/node here: load `fs` untyped to read the real entry file.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string
}

describe('zodJitless', () => {
  it('turns zod jitless on once the module is imported', () => {
    expect(z.config().jitless).toBe(true)
  })

  it('is the first import of main.tsx, ahead of anything that builds a schema', () => {
    const source = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8')
    const firstImport = /^import[^\n]*$/m.exec(source)?.[0]

    expect(firstImport).toBe("import './shared/config/zodJitless'")
  })

  // The `vendor-zod` group of vite.config.ts: without it Rolldown puts this module in the entry chunk
  // and `shared/config/env.ts` (the first `z.object`) in a shared chunk the entry imports and runs
  // first, so the schema is built before `jitless` is set. This test reads the text of the group
  // only; the build output order is checked by `scripts/verify-prod-bundle.sh` (CI, after Build).
  it('keeps the vite.config.ts vendor-zod group text on zodJitless.ts and zod, off env.ts', () => {
    const config = readFileSync(new URL('../../../vite.config.ts', import.meta.url), 'utf8')
    const group = /name: 'vendor-zod',\s*test: \/(.+)\/,/.exec(config)?.[1]
    expect(group).toBeDefined()
    const test = new RegExp(group ?? '')

    expect(test.test('/app/src/shared/config/zodJitless.ts')).toBe(true)
    expect(test.test('/app/node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/core/util.js')).toBe(
      true,
    )
    expect(test.test('/app/src/shared/config/env.ts')).toBe(false)
  })
})
