import { z } from 'zod'

export const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
  VITE_GITHUB_CLIENT_ID: z.string().default('dmc_mock_client_id'),
})
export type Env = z.infer<typeof EnvSchema>

export function parseEnv(raw: unknown): Env {
  return EnvSchema.parse(raw)
}

export const env: Env = parseEnv(import.meta.env)
export const API_BASE_URL = env.VITE_API_BASE_URL
export const GITHUB_CLIENT_ID = env.VITE_GITHUB_CLIENT_ID
