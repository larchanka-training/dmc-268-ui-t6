import type { Repository } from '../../../entities/repository'
import type { RunSession } from '../../../entities/run'

interface ProgressInput {
  hasInstallation: boolean
  repositories: readonly Pick<
    Repository,
    'id' | 'provider' | 'installationAvailable' | 'enabled' | 'defaultBranch'
  >[]
  runs: readonly Pick<RunSession, 'id' | 'status'>[] | undefined
  successfulRuns: readonly Pick<RunSession, 'id' | 'status'>[] | undefined
}

export interface OnboardingProgress {
  install: boolean
  settings: boolean
  review: boolean | null
  result: boolean | null
}

export function getOnboardingProgress({
  hasInstallation,
  repositories,
  runs,
  successfulRuns,
}: ProgressInput): OnboardingProgress {
  const accessible = repositories.filter(
    (repo) => repo.provider === 'github' && repo.installationAvailable,
  )
  const hasSuccessfulRun = successfulRuns?.some((run) => run.status === 'succeeded')
  return {
    install: hasInstallation && accessible.length > 0,
    settings: accessible.some((repo) => repo.enabled && repo.defaultBranch.length > 0),
    review: runs ? runs.length > 0 || hasSuccessfulRun === true : hasSuccessfulRun ? true : null,
    result: hasSuccessfulRun ?? null,
  }
}

function dismissalKey(userId: number): string {
  return `dmc_onboarding_${String(userId)}_dismissed`
}

export function isOnboardingDismissed(userId: number): boolean {
  try {
    return localStorage.getItem(dismissalKey(userId)) === '1'
  } catch {
    return false
  }
}

export function dismissOnboarding(userId: number): void {
  try {
    localStorage.setItem(dismissalKey(userId), '1')
  } catch {
    // The checklist still hides in this tab when browser storage is unavailable.
  }
}
