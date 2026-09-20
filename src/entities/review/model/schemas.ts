import { z } from 'zod'

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info'])
export type Severity = z.infer<typeof SeveritySchema>

export const CategorySchema = z.enum(['security', 'correctness', 'performance', 'readability'])
export type Category = z.infer<typeof CategorySchema>

export const ReviewCommentSchema = z
  .object({
    id: z.uuid(),
    file: z.string(),
    oldLine: z.int().nonnegative().nullable(),
    newLine: z.int().nonnegative().nullable(),
    endLine: z.int().nonnegative().nullable(),
    body: z.string(),
    ruleName: z.string().nullable(),
    severity: SeveritySchema,
    category: CategorySchema,
    title: z.string(),
    createdAt: z.iso.datetime(),
  })
  .superRefine((value, ctx) => {
    if (value.oldLine === null && value.newLine === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['newLine'],
        message: 'at least one of oldLine/newLine must be set',
      })
    }
  })
export type ReviewComment = z.infer<typeof ReviewCommentSchema>
