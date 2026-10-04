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
    oldLine: z.int().min(1).nullable(),
    newLine: z.int().min(1).nullable(),
    endLine: z.int().min(1).nullable(),
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
    oldLine: z.int().min(1).nullable(),
    newLine: z.int().min(1).nullable(),
    endLine: z.int().min(1).nullable(),
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
