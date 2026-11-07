// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '../../../shared/i18n'
import { OnboardingChecklist } from './OnboardingChecklist'

vi.mock('../../../shared/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/config/env')>()),
  GITHUB_APP_SLUG: 'review-app',
}))

const repository = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  provider: 'github' as const,
  fullName: 'team/demo',
  url: 'https://github.com/team/demo',
  installationAvailable: true,
  enabled: true,
  defaultBranch: 'main',
}

const empty = {
  hasInstallation: false,
  repositories: [],
  runs: [],
  successfulRuns: [],
  runsError: false,
  onRetryRuns: vi.fn(),
}

beforeEach(async () => {
  localStorage.clear()
  await i18n.changeLanguage('en')
})
afterEach(() => {
  cleanup()
})

function show(props: Partial<ComponentProps<typeof OnboardingChecklist>> = {}) {
  return render(
    <MemoryRouter>
      <OnboardingChecklist onDismiss={vi.fn()} userId={10} {...empty} {...props} />
    </MemoryRouter>,
  )
}

describe('OnboardingChecklist', () => {
  it('shows four actionable steps with correct destinations', () => {
    show()
    expect(screen.getByRole('heading', { name: 'Get started' })).toBeTruthy()
    expect(screen.getAllByText('To do')).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Install GitHub App' }).getAttribute('href')).toContain(
      '/installations/new',
    )
    expect(screen.getByRole('link', { name: 'Open repositories' }).getAttribute('href')).toBe(
      '/repositories',
    )
    expect(screen.getByRole('link', { name: 'View runs' }).getAttribute('href')).toBe('/runs')
  })

  it('shows repository settings and pull request destinations with server data', () => {
    show({ hasInstallation: true, repositories: [repository], runs: [] })
    expect(screen.getAllByText('Done')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Review settings' }).getAttribute('href')).toBe(
      `/repositories/${repository.id}/settings`,
    )
    expect(screen.getByRole('link', { name: 'Open a pull request' }).getAttribute('href')).toBe(
      `${repository.url}/compare`,
    )
  })

  it('shows unknown run status and offers retry when run loading fails', () => {
    const onRetryRuns = vi.fn()
    show({ runs: undefined, successfulRuns: undefined, runsError: true, onRetryRuns })
    expect(screen.getAllByText('Checking')).toHaveLength(2)
    expect(screen.getByRole('alert').textContent).toContain('Run status is unavailable.')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetryRuns).toHaveBeenCalledOnce()
  })

  it('keeps a failed run as an unfinished result and links to Runs', () => {
    show({ runs: [{ id: 'failed-run', status: 'failed' }] })
    expect(screen.getAllByText('Done')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'View runs' }).getAttribute('href')).toBe('/runs')
    expect(screen.queryByRole('link', { name: 'View review result' })).toBeNull()
  })

  it('hides after a successful run, including one outside the latest unfiltered page', () => {
    show({ runs: [], successfulRuns: [{ id: 'old-success', status: 'succeeded' }] })
    expect(screen.queryByRole('heading', { name: 'Get started' })).toBeNull()
  })

  it('stores dismissal for the signed-in user and calls the focus callback', () => {
    const onDismiss = vi.fn()
    show({ onDismiss })
    fireEvent.click(screen.getByRole('button', { name: 'Hide checklist' }))
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(localStorage.getItem('dmc_onboarding_10_dismissed')).toBe('1')
    expect(screen.queryByRole('heading', { name: 'Get started' })).toBeNull()
  })
})
