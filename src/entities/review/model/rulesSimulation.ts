import { z } from 'zod'

import { CategorySchema, SeveritySchema } from './schemas'

// A review simulation of the rules playground (ui#187): `POST /api/repos/{repo_id}/rules-simulations`
// and `GET /api/rules-simulations/{simulation_id}`. PROVISIONAL: api#311 is not implemented yet and
// its body names the fields of a finding but leaves the bodies open ("paths and field names are a
// default"). Every shape the UI assumes is here and in `pages/playground/lib/simulationErrors.ts`;
// the pull request that adds the endpoints in api fixes them. Apart from `schemas.ts`, whose
// schemas the api snapshots (`tests/generate_ui_zod_contracts.mjs`).

export const SimulationModeSchema = z.enum(['code', 'diff'])
export type SimulationMode = z.infer<typeof SimulationModeSchema>

/** The body of the POST. An empty `rulesMd` means the service defaults only. */
export const RulesSimulationInputSchema = z.object({
  mode: SimulationModeSchema,
  path: z.string(),
  content: z.string(),
  rulesMd: z.string(),
})
export type RulesSimulationInput = z.infer<typeof RulesSimulationInputSchema>

/** `202` of the POST. */
export const RulesSimulationAcceptedSchema = z.object({
  id: z.uuid(),
  status: z.literal('queued'),
})
export type RulesSimulationAccepted = z.infer<typeof RulesSimulationAcceptedSchema>

/**
 * One finding (api#311, Part 4). Lines are of the pasted code, or of the right side of a diff;
 * `ruleName` is RULES_FORMAT_SPEC §8.2: `.review/rules.md`, `service-defaults:<ID>` or null.
 */
export const SimulationFindingSchema = z.object({
  path: z.string(),
  line: z.int().min(1),
  startLine: z.int().min(1).nullable(),
  severity: SeveritySchema,
  category: CategorySchema,
  title: z.string(),
  body: z.string(),
  suggestion: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  ruleName: z.string().nullable(),
})
export type SimulationFinding = z.infer<typeof SimulationFindingSchema>

const CostUsdSchema = z.number().min(0)

const QueuedSimulationSchema = z.object({ id: z.uuid(), status: z.literal('queued') })

const RunningSimulationSchema = z.object({ id: z.uuid(), status: z.literal('running') })

const SucceededSimulationSchema = z.object({
  id: z.uuid(),
  status: z.literal('succeeded'),
  findings: z.array(SimulationFindingSchema),
  tokensIn: z.int().min(0),
  tokensOut: z.int().min(0),
  costUsd: CostUsdSchema,
})

// `errorCode` is named as on a Run; `costUsd` is what the calls made before the failure cost.
const FailedSimulationSchema = z.object({
  id: z.uuid(),
  status: z.literal('failed'),
  errorCode: z.string().min(1),
  costUsd: CostUsdSchema,
})

export const RulesSimulationSchema = z.discriminatedUnion('status', [
  QueuedSimulationSchema,
  RunningSimulationSchema,
  SucceededSimulationSchema,
  FailedSimulationSchema,
])
export type RulesSimulation = z.infer<typeof RulesSimulationSchema>
