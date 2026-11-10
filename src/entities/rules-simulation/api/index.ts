import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import {
  RulesSimulationAcceptedSchema,
  RulesSimulationInputSchema,
  RulesSimulationSchema,
  type RulesSimulation,
  type RulesSimulationAccepted,
  type RulesSimulationInput,
} from '../model/schemas'

export async function startRulesSimulation(
  repoId: string,
  input: RulesSimulationInput,
): Promise<RulesSimulationAccepted> {
  const data = await apiClient<unknown>(endpoints.rulesSimulations.create(repoId), {
    body: RulesSimulationInputSchema.parse(input),
  })
  return RulesSimulationAcceptedSchema.parse(data)
}

export async function fetchRulesSimulation(
  id: string,
  signal?: AbortSignal,
): Promise<RulesSimulation> {
  const data = await apiClient<unknown>(endpoints.rulesSimulations.detail(id), { signal })
  return RulesSimulationSchema.parse(data)
}
