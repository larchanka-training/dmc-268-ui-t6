# Entity schema (Zod)

Requires: #26 (tooling), #31 (FSD layout, vitest)

## When to use

A new entity slice needs a shape for data that crosses the API boundary (a
list response, a websocket event, a form payload). Zod is the single source
of truth: infer the TypeScript type from the schema, never write the type by
hand and validate separately.

## File placement

- `src/entities/repository/model/schemas.ts`
- `src/entities/repository/model/schemas.test.ts`

## Code

<!-- proof: schemas.ts -->

```ts
import { z } from 'zod'

export const RepositoryKindSchema = z.enum(['metric', 'chart', 'table'])
export type RepositoryKind = z.infer<typeof RepositoryKindSchema>

export const RepositoryLayoutSchema = z.object({
  x: z.int().nonnegative(),
  y: z.int().nonnegative(),
  width: z.int().positive(),
  height: z.int().positive(),
})
export type RepositoryLayout = z.infer<typeof RepositoryLayoutSchema>

export const FooSchema = z.object({
  id: z.uuid(),
  kind: RepositoryKindSchema,
  title: z.string(),
  createdAt: z.iso.datetime(),
  layout: RepositoryLayoutSchema,
})
export type Foo = z.infer<typeof FooSchema>

export const FooListSchema = z.array(FooSchema)
export type FooList = z.infer<typeof FooListSchema>
```

## Test

<!-- proof: schemas.test.ts -->

```ts
import { describe, expect, it } from 'vitest'

import { FooSchema } from './schemas'

const foo = {
  id: '11111111-1111-4111-8111-000000000001',
  kind: 'metric',
  title: 'Open runs',
  createdAt: '2026-09-18T10:00:00.000Z',
  layout: { x: 0, y: 0, width: 4, height: 2 },
}

describe('FooSchema', () => {
  it('accepts a valid Foo', () => {
    expect(FooSchema.safeParse(foo).success).toBe(true)
  })

  it('rejects an unknown kind', () => {
    const result = FooSchema.safeParse({ ...foo, kind: 'unknown' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['kind'])
    }
  })
})
```

## Checklist

- `z.uuid()` / `z.iso.datetime()` / `z.int()` — never `z.string().uuid()` or
  `z.number().int()` (zod 4 `no-deprecated`).
- One schema per concept; compose nested shapes as separate exported schemas,
  not inline object literals.
- Export the inferred type next to its schema (`export type X = z.infer<typeof XSchema>`).
- A `<Name>ListSchema` wraps a page/collection response — do not reuse the
  singular schema's name for both.
- Test asserts `safeParse().success` as a literal `true`/`false` and, for the
  rejection case, one literal `issues[0]?.path`.
