import { z } from 'zod'

export const DiffLineTypeSchema = z.enum(['context', 'added', 'removed'])
export type DiffLineType = z.infer<typeof DiffLineTypeSchema>

export const DiffLineSchema = z
  .object({
    type: DiffLineTypeSchema,
    oldLine: z.int().nonnegative().nullable(),
    newLine: z.int().nonnegative().nullable(),
    content: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'context' && (value.oldLine === null || value.newLine === null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['oldLine'],
        message: 'context line requires both oldLine and newLine',
      })
    }
    if (value.type === 'added' && (value.oldLine !== null || value.newLine === null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['oldLine'],
        message: 'added line requires oldLine null and newLine set',
      })
    }
    if (value.type === 'removed' && (value.newLine !== null || value.oldLine === null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['newLine'],
        message: 'removed line requires newLine null and oldLine set',
      })
    }
  })
export type DiffLine = z.infer<typeof DiffLineSchema>

export const ChunkSchema = z.object({
  header: z.string(),
  lines: z.array(DiffLineSchema),
})
export type Chunk = z.infer<typeof ChunkSchema>

export const FileDiffSchema = z.object({
  filename: z.string(),
  chunks: z.array(ChunkSchema),
})
export type FileDiff = z.infer<typeof FileDiffSchema>

export const RawFileDiffSchema = z.object({
  filename: z.string(),
  patch: z.string(),
})
export type RawFileDiff = z.infer<typeof RawFileDiffSchema>

export const FileSliceSchema = z.object({
  path: z.string(),
  startLine: z.int().positive(),
  lines: z.array(z.string()),
  totalLines: z.int().nonnegative(),
  nextOffset: z.int().nonnegative().nullable(),
})
export type FileSlice = z.infer<typeof FileSliceSchema>

export const FileSliceQuerySchema = z.object({
  path: z.string(),
  offset: z.int().nonnegative().default(0),
  limit: z.int().positive().max(500).default(200),
})
export type FileSliceQuery = z.infer<typeof FileSliceQuerySchema>
