// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import { i18n } from '../../../shared/i18n'
import { markRepositorySettingsViewed } from '../lib/onboarding'
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
}

const empty = { hasInstallation: false, repositories: [], runs: [] }

beforeEach(async () => {
  localStorage.clear()
  await i18n.changeLanguage('en')
})
afterEach(() => {
  cleanup()
})

function show(
  props: Omit<ComponentProps<typeof OnboardingChecklist>, 'onDismiss'> & {
    onDismiss?: () => void
  },
) {
  return render(
    <MemoryRouter>
      <OnboardingChecklist {...props} onDismiss={props.onDismiss ?? vi.fn()} />
    </MemoryRouter>,
  )
}

describe('OnboardingChecklist', () => {
  it('shows four actionable steps to a new user', () => {
    show({ userId: 10, ...empty })
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

  it('uses repository, run and viewed result data for progress and destinations', () => {
    markRepositorySettingsViewed(10, repository.id)
    show({
      userId: 10,
      hasInstallation: true,
      repositories: [repository],
      runs: [{ id: 'run-1', status: 'succeeded' }],
    })
    expect(screen.getAllByText('Done')).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Review settings' }).getAttribute('href')).toBe(
      `/repositories/${repository.id}/settings`,
    )
    expect(screen.getByRole('link', { name: 'Open a pull request' }).getAttribute('href')).toBe(
      `${repository.url}/compare`,
    )
    expect(screen.getByRole('link', { name: 'View review result' }).getAttribute('href')).toBe(
      '/runs/run-1',
    )
  })

  it('persists dismissal per user and hides a completed checklist', () => {
    const heading = document.createElement('h1')
    heading.tabIndex = -1
    document.body.append(heading)
    const props = {
      userId: 10,
      ...empty,
      onDismiss: () => {
        heading.focus()
      },
    }
    const view = show(props)
    fireEvent.click(screen.getByRole('button', { name: 'Hide checklist' }))
    expect(document.activeElement).toBe(heading)
    expect(screen.queryByRole('heading', { name: 'Get started' })).toBeNull()
    view.unmount()
    show(props)
    expect(screen.queryByRole('heading', { name: 'Get started' })).toBeNull()
    cleanup()
    show({ ...props, userId: 11 })
    expect(screen.getByRole('heading', { name: 'Get started' })).toBeTruthy()
    localStorage.setItem('dmc_onboarding_11_viewed_result', '1')
    cleanup()
    show({ ...props, userId: 11 })
    expect(screen.queryByRole('heading', { name: 'Get started' })).toBeNull()
    heading.remove()
  })
})
