import { z } from 'zod'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'

const AgentTokenSchema = z.object({
  id: z.uuid(),
  repository: z.string().min(1),
  createdAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
})

export type AgentToken = z.infer<typeof AgentTokenSchema>

export const AGENT_TOKENS_QUERY_KEY = ['agent-tokens'] as const

export async function listAgentTokens(): Promise<AgentToken[]> {
  const data = await apiClient<unknown>(endpoints.agentTokens.list())
  return z.array(AgentTokenSchema).parse(data)
}

export async function revokeAgentToken(id: string): Promise<void> {
  await apiClient<unknown>(endpoints.agentTokens.revoke(z.uuid().parse(id)))
}
