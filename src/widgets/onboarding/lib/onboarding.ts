import type { Repository } from '../../../entities/repository'
import type { RunSession } from '../../../entities/run'

interface ProgressInput {
  hasInstallation: boolean
  repositories: readonly Pick<Repository, 'id' | 'provider' | 'installationAvailable' | 'enabled'>[]
  runs: readonly Pick<RunSession, 'id' | 'status'>[]
  viewedSettingsRepoIds: readonly string[]
  viewedResult: boolean
}

export function getOnboardingProgress({
  hasInstallation,
  repositories,
  runs,
  viewedSettingsRepoIds,
  viewedResult,
}: ProgressInput): readonly [boolean, boolean, boolean, boolean] {
  const accessible = repositories.filter(
    (repo) => repo.provider === 'github' && repo.installationAvailable,
  )
  return [
    hasInstallation && accessible.length > 0,
    accessible.some((repo) => repo.enabled && viewedSettingsRepoIds.includes(repo.id)),
    runs.length > 0,
    viewedResult,
  ]
}

function storageKey(userId: number, name: string): string {
  return `dmc_onboarding_${String(userId)}_${name}`
}

function readFlag(userId: number, name: string): boolean {
  try {
    return localStorage.getItem(storageKey(userId, name)) === '1'
  } catch {
    return false
  }
}

function writeFlag(userId: number, name: string): void {
  try {
    localStorage.setItem(storageKey(userId, name), '1')
  } catch {
    // The checklist still responds in this tab when browser storage is unavailable.
  }
}

export function isOnboardingDismissed(userId: number): boolean {
  return readFlag(userId, 'dismissed')
}

export function dismissOnboarding(userId: number): void {
  writeFlag(userId, 'dismissed')
}

export function hasViewedSuccessfulRun(userId: number): boolean {
  return readFlag(userId, 'viewed_result')
}

export function markSuccessfulRunViewed(userId: number): void {
  writeFlag(userId, 'viewed_result')
}

export function hasViewedRepositorySettings(userId: number, repositoryId: string): boolean {
  return readFlag(userId, `settings_${repositoryId}`)
}

export function markRepositorySettingsViewed(userId: number, repositoryId: string): void {
  writeFlag(userId, `settings_${repositoryId}`)
}
