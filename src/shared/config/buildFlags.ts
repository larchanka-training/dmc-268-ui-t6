/** Set at build time from `VITE_USE_MOCKS` (Refs #65, AC 3.3). */
declare const __VITE_MOCKS_BUILD__: boolean

export const VITE_MOCKS_BUILD: boolean = __VITE_MOCKS_BUILD__

/** Mock UI and transport when the build allows mocks or dev env enables them. */
export function mocksEnabledAtRuntime(isMockMode: () => boolean): boolean {
  return VITE_MOCKS_BUILD || (import.meta.env.DEV && isMockMode())
}
