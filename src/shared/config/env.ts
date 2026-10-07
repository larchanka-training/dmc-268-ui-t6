import { z } from 'zod'

import { VITE_MOCKS_BUILD } from './buildFlags'

export const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
  VITE_GITHUB_CLIENT_ID: z.string().default(''),
  VITE_GITHUB_APP_SLUG: z.string().default(''),
})
export type Env = z.infer<typeof EnvSchema>

export function parseEnv(raw: unknown): Env {
  return EnvSchema.parse(raw)
}

export const env: Env = parseEnv(import.meta.env)
export const API_BASE_URL = env.VITE_API_BASE_URL
export const GITHUB_CLIENT_ID = env.VITE_GITHUB_CLIENT_ID
export const GITHUB_APP_SLUG = env.VITE_GITHUB_APP_SLUG
/** Compile-time mock flag from `vite.config.ts` `define` (Refs #65, AC 3.3). */
export const USE_MOCKS = VITE_MOCKS_BUILD

/** Single entry point for mock mode (Refs #65). */
export function isMockMode(): boolean {
  return USE_MOCKS
}
