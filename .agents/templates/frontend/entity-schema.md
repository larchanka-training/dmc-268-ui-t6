# Entity schema (Zod)

## When to use

A new entity slice needs a shape for data that crosses the API boundary (a
list response, an SSE event, a form payload). Zod is the single source
of truth: infer the TypeScript type from the schema, never write the type by
hand and validate separately.

## File placement

- `src/entities/sample-tile/model/schemas.ts`
- `src/entities/sample-tile/model/schemas.test.ts`

## Code

<!-- proof: schemas.ts -->

```ts
import { z } from 'zod'

export const SampleTileKindSchema = z.enum(['metric', 'chart', 'table'])
export type SampleTileKind = z.infer<typeof SampleTileKindSchema>

export const SampleTileLayoutSchema = z.object({
  x: z.int().nonnegative(),
  y: z.int().nonnegative(),
  width: z.int().positive(),
  height: z.int().positive(),
})
export type SampleTileLayout = z.infer<typeof SampleTileLayoutSchema>

export const SampleTileSchema = z.object({
  id: z.uuid(),
  kind: SampleTileKindSchema,
  title: z.string(),
  createdAt: z.iso.datetime(),
  layout: SampleTileLayoutSchema,
})
export type SampleTile = z.infer<typeof SampleTileSchema>

export const SampleTileListSchema = z.array(SampleTileSchema)
export type SampleTileList = z.infer<typeof SampleTileListSchema>
```

## Test

<!-- proof: schemas.test.ts -->

```ts
import { describe, expect, it } from 'vitest'

import { SampleTileSchema } from './schemas'

const sampleTile = {
  id: '11111111-1111-4111-8111-000000000001',
  kind: 'metric',
  title: 'Open runs',
  createdAt: '2026-09-18T10:00:00.000Z',
  layout: { x: 0, y: 0, width: 4, height: 2 },
}

describe('SampleTileSchema', () => {
  it('accepts a valid SampleTile', () => {
    expect(SampleTileSchema.safeParse(sampleTile).success).toBe(true)
  })

  it('rejects an unknown kind', () => {
    const result = SampleTileSchema.safeParse({ ...sampleTile, kind: 'unknown' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['kind'])
    }
  })
})
```

## Checklist

- `z.uuid()`, `z.iso.datetime()` (the string-method forms are `@deprecated`, so
  `no-deprecated` fires). `z.int()` over the legacy `z.number().int()` (a
  convention, as in main's schemas).
- One schema per concept; compose nested shapes as separate exported schemas,
  not inline object literals.
- Export the inferred type next to its schema (`export type X = z.infer<typeof XSchema>`).
- Paged list responses are an envelope, as in `RunListPageSchema`:
  `<Name>ListPageSchema = z.object({ items: z.array(XSchema), nextCursor: z.string().nullable() })`.
  Use a bare `z.array` only for unpaged lists.
- `SampleTileListSchema` above is unpaged (the full set in one response, no
  cursor), so a bare array is right; a paged endpoint uses the envelope.
- Test asserts `safeParse().success` as a literal `true`/`false` and, for the
  rejection case, one literal `issues[0]?.path`.
