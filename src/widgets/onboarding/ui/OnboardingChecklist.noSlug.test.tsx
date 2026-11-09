// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { i18n } from '../../../shared/i18n'
import { OnboardingChecklist } from './OnboardingChecklist'

vi.mock('../../../shared/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/config/env')>()),
  GITHUB_APP_SLUG: '',
}))

beforeEach(async () => {
  await i18n.changeLanguage('en')
})
afterEach(() => {
  cleanup()
})

it('explains why installation is unavailable when the App slug is missing', () => {
  render(
    <MemoryRouter>
      <OnboardingChecklist
        hasInstallation={false}
        onDismiss={vi.fn()}
        onRetryRuns={vi.fn()}
        repositories={[]}
        runs={[]}
        runsError={false}
        successfulRuns={[]}
        userId={174}
      />
    </MemoryRouter>,
  )

  expect(screen.getByRole('button', { name: 'Install GitHub App' }).hasAttribute('disabled')).toBe(
    true,
  )
  expect(screen.getByText('Installation is unavailable. Contact your administrator.')).toBeTruthy()
})
