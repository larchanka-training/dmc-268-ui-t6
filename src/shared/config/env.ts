import { z } from 'zod'

export const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
  VITE_GITHUB_CLIENT_ID: z.string().default(''),
  VITE_GITHUB_APP_SLUG: z.string().default(''),
  VITE_USE_MOCKS: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === 'true' || val === '1'),
})
export type Env = z.infer<typeof EnvSchema>

export function parseEnv(raw: unknown): Env {
  return EnvSchema.parse(raw)
}

export const env: Env = parseEnv(import.meta.env)
export const API_BASE_URL = env.VITE_API_BASE_URL
export const GITHUB_CLIENT_ID = env.VITE_GITHUB_CLIENT_ID
export const GITHUB_APP_SLUG = env.VITE_GITHUB_APP_SLUG
export const USE_MOCKS = env.VITE_USE_MOCKS
