import { skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { ZodError } from 'zod'

import { ApiError, apiClient } from '../../../shared/api/client'
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

export const RULES_SIMULATION_POLL_MS = 2000

export function rulesSimulationQueryKey(id: string) {
  return ['rulesSimulation', id] as const
}

/** Starts a simulation; a refusal is read with `lib/simulationErrors.ts`. */
export function useStartRulesSimulation() {
  return useMutation({
    mutationFn: ({ repoId, input }: { repoId: string; input: RulesSimulationInput }) =>
      startRulesSimulation(repoId, input),
  })
}

/** A refusal the next request would get again: a 4xx or an answer that breaks the schema. */
function isFinalError(error: unknown): boolean {
  return error instanceof ZodError || (error instanceof ApiError && error.status < 500)
}

/**
 * One simulation, asked again every `RULES_SIMULATION_POLL_MS` while it is `queued` or `running`.
 * The asking stops with `succeeded` or `failed`, which never change, and with a final error; a
 * network or server failure keeps it going, and the next answer clears the error. Nothing is asked
 * without an id.
 */
export function useRulesSimulation(id: string | null) {
  return useQuery({
    queryKey: rulesSimulationQueryKey(id ?? ''),
    queryFn: id === null ? skipToken : ({ signal }) => fetchRulesSimulation(id, signal),
    staleTime: Infinity,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'succeeded' || status === 'failed' || isFinalError(query.state.error)) {
        return false
      }
      return RULES_SIMULATION_POLL_MS
    },
  })
}
