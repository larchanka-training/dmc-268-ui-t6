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
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one property must be provided',
  })
export type UpdateRepositoryInput = z.infer<typeof UpdateRepositorySchema>

// provisional (ui#93): status of `.review/rules.md` on a repository, as the UI declares it for
// api#150. A diagnostic is RULES_FORMAT_SPEC §9 in camelCase; `message` is the server's text.
export const RulesDiagnosticSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  // 1-based position in the file, null when the problem has none.
  line: z.int().nullable(),
  column: z.int().nullable(),
  retryable: z.boolean(),
  limit: z.int().optional(),
  actual: z.int().optional(),
  patternIndex: z.int().optional(),
})
export type RulesDiagnostic = z.infer<typeof RulesDiagnosticSchema>

const GitShaSchema = z.string().regex(/^[0-9a-f]{40}$/)

// provisional (ui#93): members every variant carries.
const rulesStatusCommon = {
  branch: z.string().min(1),
  path: z.string(),
  checkedAt: z.iso.datetime(),
}

// provisional (ui#93): the file is there and was read.
const PresentRulesStatusSchema = z.object({
  ...rulesStatusCommon,
  status: z.literal('present'),
  sha: GitShaSchema,
  text: z.string(),
  ignoreMasks: z.array(z.string()),
  diagnostics: z.array(RulesDiagnosticSchema),
})

// provisional (ui#93): reliably absent, the service defaults apply.
const MissingRulesStatusSchema = z.object({
  ...rulesStatusCommon,
  status: z.literal('missing'),
  sha: GitShaSchema,
  defaultsVersion: z.string(),
})

// provisional (ui#93): the file is there and was refused; `text` is null when it was too large or
// not UTF-8.
const InvalidRulesStatusSchema = z.object({
  ...rulesStatusCommon,
  status: z.literal('invalid'),
  sha: GitShaSchema,
  text: z.string().nullable(),
  diagnostics: z.array(RulesDiagnosticSchema).min(1),
})

// provisional (ui#93): the server could not tell whether the file exists; `sha` is null when even
// the revision is unknown. `retryable` of the diagnostics decides the retry button.
const UnavailableRulesStatusSchema = z.object({
  ...rulesStatusCommon,
  status: z.literal('unavailable'),
  sha: GitShaSchema.nullable(),
  diagnostics: z.array(RulesDiagnosticSchema).min(1),
})

// provisional (ui#93)
export const RulesStatusSchema = z.discriminatedUnion('status', [
  PresentRulesStatusSchema,
  MissingRulesStatusSchema,
  InvalidRulesStatusSchema,
  UnavailableRulesStatusSchema,
])
export type RulesStatus = z.infer<typeof RulesStatusSchema>
