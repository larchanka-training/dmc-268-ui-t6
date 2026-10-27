import { z } from 'zod'

// deep (SandboxEngine) is phase 3: the api accepts only fast until then (api#52).
export const RepositoryEngineSchema = z.enum(['fast'])
export type RepositoryEngine = z.infer<typeof RepositoryEngineSchema>

export const WaitForCiSchema = z.enum(['auto', 'always', 'never'])
export type WaitForCi = z.infer<typeof WaitForCiSchema>

export const ReviewEventSchema = z.enum(['COMMENT', 'REQUEST_CHANGES'])
export type ReviewEvent = z.infer<typeof ReviewEventSchema>

export const RepositoryIdSchema = z.uuid()

export const SeverityThresholdSchema = z.enum(['all', 'warning', 'critical'])
export type SeverityThreshold = z.infer<typeof SeverityThresholdSchema>

// State of the repository's RAG code index (api#145). `disabled` while RAG is off or the GitHub App
// has no access; `empty` until a first index is built.
export const RagIndexStatusSchema = z.enum([
  'disabled',
  'empty',
  'building',
  'ready',
  'stale',
  'failed',
])
export type RagIndexStatus = z.infer<typeof RagIndexStatusSchema>

// The publication fields (`indexedCommitSha`, `indexedAt`, the counts) describe the visible index:
// they are set only for ready and stale, null or 0 otherwise.
export const RagIndexSchema = z.object({
  status: RagIndexStatusSchema,
  indexedCommitSha: z.string().nullable(),
  indexedAt: z.iso.datetime().nullable(),
  fileCount: z.int().nonnegative(),
  symbolCount: z.int().nonnegative(),
  lastErrorCode: z.string().nullable(),
})
export type RagIndex = z.infer<typeof RagIndexSchema>

// The index of a repository with RAG off, as the api serves it.
export const disabledRagIndex: RagIndex = {
  status: 'disabled',
  indexedCommitSha: null,
  indexedAt: null,
  fileCount: 0,
  symbolCount: 0,
  lastErrorCode: null,
}

export const RepositorySchema = z.object({
  id: RepositoryIdSchema,
  fullName: z.string().min(1),
  url: z.url(),
  defaultBranch: z.string().min(1),
  enabled: z.boolean(),
  defaultEngine: RepositoryEngineSchema,
  waitForCi: WaitForCiSchema,
  maxComments: z.number().int().min(1).max(10),
  reviewEvent: ReviewEventSchema,
  branchFilter: z.array(z.string().min(1).max(255)).max(20),
  severityThreshold: SeverityThresholdSchema,
  installationAvailable: z.boolean(),
  ragEnabled: z.boolean(),
  ragIndex: RagIndexSchema,
})
export type Repository = z.infer<typeof RepositorySchema>

export const UpdateRepositorySchema = z
  .object({
    enabled: z.boolean().optional(),
    defaultEngine: RepositoryEngineSchema.optional(),
    waitForCi: WaitForCiSchema.optional(),
    maxComments: z.number().int().min(1).max(10).optional(),
    reviewEvent: ReviewEventSchema.optional(),
    branchFilter: z.array(z.string().min(1).max(255)).max(20).optional(),
    severityThreshold: SeverityThresholdSchema.optional(),
    ragEnabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one property must be provided',
  })
export type UpdateRepositoryInput = z.infer<typeof UpdateRepositorySchema>

// Status of `.review/rules.md` of a repository: `GET /api/repos/{id}/rules-status` (api#150, api
// PR #202). A diagnostic is RULES_FORMAT_SPEC §9 in camelCase; `message` is the server's text.
export const RulesDiagnosticSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  // 1-based position in the file, null when the problem has none.
  line: z.int().nullable(),
  column: z.int().nullable(),
  retryable: z.boolean(),
  limit: z.int().optional(),
  actual: z.int().optional(),
  // True when the server stopped reading the file, so the real value is more than `actual`;
  // absent when `actual` is exact.
  actualIsLowerBound: z.boolean().optional(),
  patternIndex: z.int().optional(),
})
export type RulesDiagnostic = z.infer<typeof RulesDiagnosticSchema>

const GitShaSchema = z.string().regex(/^[0-9a-f]{40}$/)

// Members the four variants that have been read carry (`pending` has no time, so it is apart).
const rulesStatusCommon = {
  branch: z.string().min(1),
  path: z.string(),
  checkedAt: z.iso.datetime(),
}

// The file is there and was read.
const PresentRulesStatusSchema = z.object({
  ...rulesStatusCommon,
  status: z.literal('present'),
  sha: GitShaSchema,
  text: z.string(),
  ignoreMasks: z.array(z.string()),
  diagnostics: z.array(RulesDiagnosticSchema),
})

// Reliably absent, the service defaults apply. `defaultsVersion` is `unknown` when the repository
// has no active rule version.
const MissingRulesStatusSchema = z.object({
  ...rulesStatusCommon,
  status: z.literal('missing'),
  sha: GitShaSchema,
  defaultsVersion: z.string(),
})

// The file is there and was refused; `text` is null when it was too large or not UTF-8.
const InvalidRulesStatusSchema = z.object({
  ...rulesStatusCommon,
  status: z.literal('invalid'),
  sha: GitShaSchema,
  text: z.string().nullable(),
  diagnostics: z.array(RulesDiagnosticSchema).min(1),
})

// The server could not tell whether the file exists; `sha` is null when even the revision is
// unknown. `retryable` of the diagnostics decides the retry button.
const UnavailableRulesStatusSchema = z.object({
  ...rulesStatusCommon,
  status: z.literal('unavailable'),
  sha: GitShaSchema.nullable(),
  diagnostics: z.array(RulesDiagnosticSchema).min(1),
})

// Not read yet: the GET that returns it has asked the worker to read the file, a later GET shows
// the result. There is no revision and no time.
const PendingRulesStatusSchema = z.object({
  status: z.literal('pending'),
  branch: z.string().min(1),
  path: z.string(),
  sha: z.null(),
  checkedAt: z.null(),
})

export const RulesStatusSchema = z.discriminatedUnion('status', [
  PresentRulesStatusSchema,
  MissingRulesStatusSchema,
  InvalidRulesStatusSchema,
  UnavailableRulesStatusSchema,
  PendingRulesStatusSchema,
])
export type RulesStatus = z.infer<typeof RulesStatusSchema>
