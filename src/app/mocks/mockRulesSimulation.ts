import {
  RulesSimulationInputSchema,
  type RulesSimulation,
  type RulesSimulationAccepted,
  type RulesSimulationInput,
  type SimulationFinding,
} from '../../entities/review'
import { ApiError } from '../../shared/api/client'

// Review simulations of the rules playground (api#311, not implemented yet): what the provisional
// contract in `entities/review/model/rulesSimulation.ts` says the api answers. As with the RAG index, the
// simulation moves by the number of GETs, not by time (FRONTEND_ARCHITECTURE §8): the first GET
// sees it `queued`, the second `running`, the third and later `succeeded`. Refusals other than
// these (budget, rules that do not parse, a failed model) are the tests' business
// (`withMockTransportOverlay`). Ids start with `5a5a5a5a-5a5a-4a5a-8a5a`, which
// `scripts/verify-prod-bundle.sh` looks for in the prod bundle.

const ID_PREFIX = '5a5a5a5a-5a5a-4a5a-8a5a-'
const CONTENT_LIMIT_BYTES = 64 * 1024
const GETS_TO_FINISH = 3

interface StoredSimulation {
  id: string
  input: RulesSimulationInput
  gets: number
}

const simulations = new Map<string, StoredSimulation>()
let sequence = 0

export function resetMockRulesSimulations(): void {
  simulations.clear()
  sequence = 0
}

function isActive(simulation: StoredSimulation): boolean {
  return simulation.gets < GETS_TO_FINISH
}

/** Findings by the rules text (when there is one), by a default check and by no rule. */
function fixtureFindings(input: RulesSimulationInput): SimulationFinding[] {
  const lineCount = input.content.split('\n').length
  const at = (line: number): number => Math.min(line, lineCount)
  const path = input.path === '' ? 'snippet' : input.path
  const byRules: SimulationFinding[] =
    input.rulesMd.trim() === ''
      ? []
      : [
          {
            path,
            line: at(2),
            startLine: at(1),
            severity: 'high',
            category: 'security',
            title: 'Query built from user input',
            body: 'The rules ask for parameterized queries; this one is built by concatenation.',
            suggestion: null,
            confidence: 0.86,
            ruleName: '.review/rules.md',
          },
        ]
  return [
    ...byRules,
    {
      path,
      line: at(3),
      startLine: null,
      severity: 'medium',
      category: 'correctness',
      title: 'Error is swallowed',
      body: 'The exception is caught and dropped, so the caller never learns of the failure.',
      suggestion: null,
      confidence: 0.71,
      ruleName: 'service-defaults:E2',
    },
    {
      path,
      line: at(1),
      startLine: null,
      severity: 'low',
      category: 'readability',
      title: 'Name says little',
      body: 'A name that tells what the value holds reads better here.',
      suggestion: 'total_price = 1',
      confidence: 0.55,
      ruleName: null,
    },
  ]
}

/** `POST /repos/{repoId}/rules-simulations`, for a repository the caller can see. */
export function startMockRulesSimulation(body: unknown): RulesSimulationAccepted {
  const parsed = RulesSimulationInputSchema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError(422, 'Unprocessable Entity', {
      detail: [{ loc: ['body'], msg: 'invalid simulation input', type: 'value_error' }],
    })
  }
  const active = [...simulations.values()].find(isActive)
  if (active) {
    throw new ApiError(409, 'Conflict', { detail: 'active_simulation_exists', id: active.id })
  }
  if (new TextEncoder().encode(parsed.data.content).length > CONTENT_LIMIT_BYTES) {
    throw new ApiError(422, 'Unprocessable Entity', { detail: 'content_too_large' })
  }
  sequence += 1
  const id = `${ID_PREFIX}${sequence.toString(16).padStart(12, '0')}`
  simulations.set(id, { id, input: parsed.data, gets: 0 })
  return { id, status: 'queued' }
}

/** `GET /rules-simulations/{id}`: each answer moves the simulation one step on. */
export function readMockRulesSimulation(id: string): RulesSimulation {
  const simulation = simulations.get(id)
  if (!simulation) {
    throw new ApiError(404, 'Not Found', { detail: 'Not Found' })
  }
  simulation.gets = Math.min(simulation.gets + 1, GETS_TO_FINISH)
  if (simulation.gets === 1) {
    return { id, status: 'queued' }
  }
  if (simulation.gets === 2) {
    return { id, status: 'running' }
  }
  return {
    id,
    status: 'succeeded',
    findings: fixtureFindings(simulation.input),
    tokensIn: 1840,
    tokensOut: 312,
    costUsd: 0.0123,
  }
}
