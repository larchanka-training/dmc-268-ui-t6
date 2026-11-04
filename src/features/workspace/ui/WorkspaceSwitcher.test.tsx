// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AUTH_ME_QUERY_KEY, type Workspace } from '../../../entities/user'
import { useWorkspaceStore } from '../model/store'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import styles from './WorkspaceSwitcher.module.css'

const PERSONAL: Workspace = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'GitHub: skvertl',
  installationId: 12345,
}
const ORGANIZATION: Workspace = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  name: 'GitHub: larchanka-training',
  installationId: 67890,
}

let client: QueryClient

function renderSwitcher(workspaces: Workspace[] | null, compact = false) {
  if (workspaces !== null) {
    client.setQueryData(AUTH_ME_QUERY_KEY, {
      id: 114473628,
      login: 'skvertl',
      name: null,
      avatarUrl: null,
      workspaces,
    })
  }
  return render(
    <QueryClientProvider client={client}>
      <WorkspaceSwitcher compact={compact} enabled={false} />
    </QueryClientProvider>,
  )
}

function openMenu(): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: /^Workspace: / }))
  return screen.getByRole('menu')
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useWorkspaceStore.setState({ selectedId: null })
})

afterEach(() => {
  cleanup()
  client.clear()
  localStorage.clear()
})

describe('WorkspaceSwitcher', () => {
  it('shows nothing until the current user is known', () => {
    const { container } = renderSwitcher(null)
    expect(container.textContent).toBe('')
  })

  it('shows nothing when the user has no workspace', () => {
    const { container } = renderSwitcher([])
    expect(container.textContent).toBe('')
  })

  describe('with one workspace', () => {
    it('shows its name as plain text, with nothing to press', () => {
      renderSwitcher([PERSONAL])
      const name = screen.getByText('GitHub: skvertl')
      expect(name.classList.contains(styles.clipped ?? '')).toBe(false)
      expect(screen.queryByRole('button')).toBeNull()
    })

    it('hides the name from the eye when folded, but keeps it for assistive tech', () => {
      renderSwitcher([PERSONAL], true)
      const name = screen.getByText('GitHub: skvertl')
      expect(name.classList.contains(styles.clipped ?? '')).toBe(true)
      expect(screen.queryByRole('button')).toBeNull()
    })

    it.each([false, true])('tells assistive tech what the name is, folded=%s', (compact) => {
      renderSwitcher([PERSONAL], compact)
      const title = screen.getByText('Workspace')
      expect(title.classList.contains(styles.clipped ?? '')).toBe(true)
    })
  })

  describe('with several workspaces', () => {
    it('names the current workspace on the button', () => {
      renderSwitcher([PERSONAL, ORGANIZATION])
      const trigger = screen.getByRole('button', { name: 'Workspace: GitHub: skvertl' })
      expect(trigger.tagName).toBe('BUTTON')
      expect(within(trigger).getByText('GitHub: skvertl')).toBeTruthy()
    })

    it('shows the saved workspace after a reload', () => {
      useWorkspaceStore.setState({ selectedId: ORGANIZATION.id })
      renderSwitcher([PERSONAL, ORGANIZATION])
      expect(
        screen.getByRole('button', { name: 'Workspace: GitHub: larchanka-training' }),
      ).toBeTruthy()
    })

    it('folded, hides the name from the eye but keeps it in the accessible name', () => {
      renderSwitcher([PERSONAL, ORGANIZATION], true)
      const trigger = screen.getByRole('button', { name: 'Workspace: GitHub: skvertl' })
      expect(within(trigger).queryByText('GitHub: skvertl')).toBeNull()
    })

    it('reports the menu state on the button', () => {
      renderSwitcher([PERSONAL, ORGANIZATION])
      const trigger = screen.getByRole('button', { name: 'Workspace: GitHub: skvertl' })
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
      fireEvent.click(trigger)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')
    })

    it('lists every workspace as one radio choice, with the current one checked', () => {
      renderSwitcher([PERSONAL, ORGANIZATION])
      const menu = openMenu()
      const radios = within(menu).getAllByRole('menuitemradio')
      expect(radios).toHaveLength(2)
      expect(radios[0]?.getAttribute('aria-checked')).toBe('true')
      expect(radios[1]?.getAttribute('aria-checked')).toBe('false')
    })

    it('tells two workspaces apart by their full name and installation', () => {
      renderSwitcher([PERSONAL, ORGANIZATION])
      const menu = openMenu()
      expect(within(menu).getByText('GitHub: skvertl')).toBeTruthy()
      expect(within(menu).getByText('ID установки: 12345')).toBeTruthy()
      expect(within(menu).getByText('GitHub: larchanka-training')).toBeTruthy()
      expect(within(menu).getByText('ID установки: 67890')).toBeTruthy()
    })

    it('switches and saves on a choice', () => {
      renderSwitcher([PERSONAL, ORGANIZATION])
      const menu = openMenu()
      fireEvent.click(within(menu).getByText('GitHub: larchanka-training'))
      expect(
        screen.getByRole('button', { name: 'Workspace: GitHub: larchanka-training' }),
      ).toBeTruthy()
      expect(localStorage.getItem('dmc_current_workspace')).toBe(ORGANIZATION.id)
    })

    it('closes the menu and returns the focus to the button after a choice', async () => {
      renderSwitcher([PERSONAL, ORGANIZATION])
      const trigger = screen.getByRole('button', { name: 'Workspace: GitHub: skvertl' })
      fireEvent.click(trigger)
      fireEvent.click(within(screen.getByRole('menu')).getByText('GitHub: larchanka-training'))
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
      await waitFor(() => {
        expect(document.activeElement).toBe(trigger)
      })
    })
  })
})
