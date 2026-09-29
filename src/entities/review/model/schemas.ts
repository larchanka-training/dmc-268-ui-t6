import { z } from 'zod'

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info'])
export type Severity = z.infer<typeof SeveritySchema>

export const CategorySchema = z.enum(['security', 'correctness', 'performance', 'readability'])
export type Category = z.infer<typeof CategorySchema>

export const SideSchema = z.enum(['LEFT', 'RIGHT'])
export type Side = z.infer<typeof SideSchema>

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

export const FindingViewSchema = z
  .object({
    id: z.uuid(),
    file: z.string(),
    // Contract `FindingView` sets `minimum: 1` on all three — unlike `ReviewComment`
    // above, which is `minimum: 0`. Deliberately not unified with the sibling schema.
    oldLine: z.int().positive().nullable(),
    newLine: z.int().positive().nullable(),
    endLine: z.int().positive().nullable(),
    side: SideSchema,
    severity: SeveritySchema,
    category: CategorySchema,
    title: z.string(),
    body: z.string(),
    suggestion: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    ruleName: z.string().nullable(),
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
export type FindingView = z.infer<typeof FindingViewSchema>
