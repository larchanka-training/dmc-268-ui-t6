// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import {
  getOnboardingProgress,
  isOnboardingDismissed,
  hasViewedSuccessfulRun,
  dismissOnboarding,
  markSuccessfulRunViewed,
} from './onboarding'

describe('onboarding progress', () => {
  const connectedRepo = {
    id: 'repo-1',
    provider: 'github' as const,
    installationAvailable: true,
    enabled: false,
  }

  it('waits for an installation and an accessible repository before completing the first step', () => {
    expect(
      getOnboardingProgress({
        hasInstallation: false,
        repositories: [],
        runs: [],
        viewedResult: false,
      }),
    ).toEqual([false, false, false, false])
    expect(
      getOnboardingProgress({
        hasInstallation: true,
        repositories: [],
        runs: [],
        viewedResult: false,
      })[0],
    ).toBe(false)
    expect(
      getOnboardingProgress({
        hasInstallation: true,
        repositories: [connectedRepo],
        runs: [],
        viewedResult: false,
      }),
    ).toEqual([true, false, false, false])
  })

  it('uses enabled review, an actual run and a viewed successful result for later steps', () => {
    const enabledRepo = { ...connectedRepo, enabled: true }
    const input = {
      hasInstallation: true,
      repositories: [enabledRepo],
      runs: [{ id: 'run-1', status: 'running' as const }],
      viewedResult: false,
    }
    expect(getOnboardingProgress(input)).toEqual([true, true, true, false])
    expect(getOnboardingProgress({ ...input, viewedResult: true })).toEqual([
      true,
      true,
      true,
      true,
    ])
  })

  it('does not treat a Bitbucket repository as a GitHub App installation', () => {
    expect(
      getOnboardingProgress({
        hasInstallation: true,
        repositories: [{ ...connectedRepo, provider: 'bitbucket' }],
        runs: [],
        viewedResult: false,
      }),
    ).toEqual([false, false, false, false])
  })
})

describe('onboarding persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps dismissal and viewed results separate for each user', () => {
    dismissOnboarding(10)
    markSuccessfulRunViewed(10)
    expect(isOnboardingDismissed(10)).toBe(true)
    expect(hasViewedSuccessfulRun(10)).toBe(true)
    expect(isOnboardingDismissed(11)).toBe(false)
    expect(hasViewedSuccessfulRun(11)).toBe(false)
  })
})
