// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import { dismissOnboarding, getOnboardingProgress, isOnboardingDismissed } from './onboarding'

describe('onboarding progress', () => {
  const connectedRepo = {
    id: 'repo-1',
    provider: 'github' as const,
    installationAvailable: true,
    enabled: false,
    defaultBranch: 'main',
  }

  it('does not claim run progress while the run requests are unresolved', () => {
    expect(
      getOnboardingProgress({
        hasInstallation: false,
        repositories: [],
        runs: undefined,
        successfulRuns: undefined,
      }),
    ).toEqual({ install: false, settings: false, review: null, result: null })
  })

  it('uses installation, accessible repository settings and real runs for each step', () => {
    const readyRepo = { ...connectedRepo, enabled: true }
    expect(
      getOnboardingProgress({
        hasInstallation: true,
        repositories: [connectedRepo],
        runs: [],
        successfulRuns: [],
      }),
    ).toEqual({ install: true, settings: false, review: false, result: false })
    expect(
      getOnboardingProgress({
        hasInstallation: true,
        repositories: [readyRepo],
        runs: [{ id: 'run-1', status: 'running' }],
        successfulRuns: [],
      }),
    ).toEqual({ install: true, settings: true, review: true, result: false })
    expect(
      getOnboardingProgress({
        hasInstallation: true,
        repositories: [readyRepo],
        runs: [],
        successfulRuns: [{ id: 'old-success', status: 'succeeded' }],
      }),
    ).toEqual({ install: true, settings: true, review: true, result: true })
  })

  it('does not count Bitbucket settings as GitHub App setup', () => {
    expect(
      getOnboardingProgress({
        hasInstallation: true,
        repositories: [{ ...connectedRepo, provider: 'bitbucket', enabled: true }],
        runs: [],
        successfulRuns: [],
      }),
    ).toEqual({ install: false, settings: false, review: false, result: false })
  })
})

describe('onboarding dismissal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists the hidden state for the current browser and user only', () => {
    dismissOnboarding(10)
    expect(isOnboardingDismissed(10)).toBe(true)
    expect(isOnboardingDismissed(11)).toBe(false)
  })
})
