// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App, ConfigProvider } from 'antd'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH_ME_QUERY_KEY, type Me, type Workspace } from '../../../entities/user'
import { ApiError, setMockTransport } from '../../../shared/api/client'
import { DeleteWorkspaceRequestSchema } from '../model/schemas'
import { WorkspaceDangerZone } from './WorkspaceDangerZone'

const OWNER_WORKSPACE: Workspace = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'acme-corp',
  installationId: 12345,
  role: 'owner',
}

const NON_OWNER_WORKSPACES: readonly Workspace[] = [
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    name: 'admin-corp',
    installationId: 1,
    role: 'admin',
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174002',
    name: 'billing-corp',
    installationId: 2,
    role: 'billing',
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174003',
    name: 'member-corp',
    installationId: 3,
    role: 'member',
  },
]

const MISSING_ROLE_WORKSPACES: readonly Workspace[] = [
  { id: '323e4567-e89b-12d3-a456-426614174001', name: 'null-role', installationId: 4, role: null },
  { id: '323e4567-e89b-12d3-a456-426614174002', name: 'undef-role', installationId: 5 },
]

let queryClient: QueryClient

function renderWithProviders(ui: ReactNode) {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QueryClientProvider client={queryClient}>
        <App>{ui}</App>
      </QueryClientProvider>
    </ConfigProvider>,
  )
}

describe('WorkspaceDangerZone', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  afterEach(() => {
    cleanup()
    setMockTransport(null)
    queryClient.clear()
    vi.restoreAllMocks()
  })

  it('uses only theme tokens, no raw hex colors, and on-grid spacing in CSS module', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/features/workspace-settings/ui/WorkspaceDangerZone.module.css'),
      'utf8',
    )
    expect(css).toContain('var(--rv-danger)')
    expect(css).toContain('var(--rv-text-2)')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\b6px\b/)
  })

  it('validates DeleteWorkspaceRequestSchema requiring 1..255 char confirmation_name', () => {
    expect(() => DeleteWorkspaceRequestSchema.parse({ confirmation_name: 'acme' })).not.toThrow()
    expect(() => DeleteWorkspaceRequestSchema.parse({ confirmation_name: '' })).toThrow()
    expect(() =>
      DeleteWorkspaceRequestSchema.parse({ confirmation_name: 'a'.repeat(256) }),
    ).toThrow()
    expect(() => DeleteWorkspaceRequestSchema.parse({})).toThrow()
  })

  it('renders Danger Zone section and active button for owner', () => {
    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)

    expect(screen.getByText(/Danger Zone/i)).toBeTruthy()
    const deleteBtn = screen.getByRole('button', { name: 'Удалить этот воркспейс' })
    expect(deleteBtn.hasAttribute('disabled')).toBe(false)
    expect(deleteBtn.getAttribute('aria-describedby')).toBeNull()
  })

  it.each(NON_OWNER_WORKSPACES)(
    'disables delete button with accessible non-owner reason for $role',
    (workspace) => {
      renderWithProviders(<WorkspaceDangerZone workspace={workspace} />)

      const deleteBtn = screen.getByRole('button', { name: 'Удалить этот воркспейс' })
      expect(deleteBtn.hasAttribute('disabled')).toBe(true)

      const reasonId = deleteBtn.getAttribute('aria-describedby')
      expect(reasonId).toBeTruthy()
      const reasonEl = document.getElementById(reasonId ?? '')
      expect(reasonEl?.textContent).toBe('Только владелец воркспейса (Owner) может удалить его.')
    },
  )

  it.each(MISSING_ROLE_WORKSPACES)(
    'fails closed and explains Owner requirement when role is $role',
    (workspace) => {
      renderWithProviders(<WorkspaceDangerZone workspace={workspace} />)

      const deleteBtn = screen.getByRole('button', { name: 'Удалить этот воркспейс' })
      expect(deleteBtn.hasAttribute('disabled')).toBe(true)

      const reasonId = deleteBtn.getAttribute('aria-describedby')
      expect(reasonId).toBeTruthy()
      const reasonEl = document.getElementById(reasonId ?? '')
      expect(reasonEl?.textContent).toBe(
        'Для управления жизненным циклом воркспейса необходимо заявить права Owner.',
      )
    },
  )

  it('opens confirmation modal and requires exact workspace name to enable confirmation', async () => {
    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)

    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))

    expect(await screen.findByText('Удаление воркспейса')).toBeTruthy()
    expect(
      screen.getByText('Это действие необратимо. Будут выполнены следующие действия:'),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Немедленная отмена подписки в Stripe без возврата средств за текущий месяц',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText('Аннулирование текущего неизрасходованного баланса и сгорание бонусов'),
    ).toBeTruthy()
    expect(
      screen.getByText('Безвозвратное удаление настроек, правил и кэша графа RAG'),
    ).toBeTruthy()
    expect(
      screen.getByText('Обезличивание и архивация финансовых проводок (хранение 7 лет)'),
    ).toBeTruthy()

    const confirmBtn = screen.getByRole('button', {
      name: 'Я понимаю последствия, удалить воркспейс',
    })
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)

    const input = screen.getByPlaceholderText('acme-corp')
    fireEvent.change(input, { target: { value: 'acme' } })
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)

    fireEvent.change(input, { target: { value: 'acme-corp-other' } })
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)

    fireEvent.change(input, { target: { value: 'acme-corp' } })
    expect(confirmBtn.hasAttribute('disabled')).toBe(false)
  })

  it('ignores cancel while deletion request is pending and closes after completion', async () => {
    let resolveDelete: ((value: unknown) => void) | undefined
    setMockTransport(() => {
      return new Promise((resolve) => {
        resolveDelete = resolve
      })
    })

    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))

    const input = await screen.findByPlaceholderText('acme-corp')
    fireEvent.change(input, { target: { value: 'acme-corp' } })

    const confirmBtn = screen.getByRole('button', {
      name: 'Я понимаю последствия, удалить воркспейс',
    })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(resolveDelete).toBeDefined()
    })

    const cancelBtn = screen.getByRole('button', { name: 'Отмена' })
    expect(cancelBtn.hasAttribute('disabled')).toBe(true)
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' })
    expect(screen.getByText('Удаление воркспейса')).toBeTruthy()
    expect(screen.getByPlaceholderText<HTMLInputElement>('acme-corp').value).toBe('acme-corp')

    act(() => {
      resolveDelete?.(null)
    })

    await waitFor(() => {
      expect(screen.queryByText('Удаление воркспейса')).toBeNull()
    })
  })

  it('sends DELETE with confirmation_name and invalidates AUTH_ME_QUERY_KEY on success', async () => {
    const initialMe: Me = {
      id: 1,
      login: 'owner',
      name: 'Owner',
      avatarUrl: null,
      workspaces: [OWNER_WORKSPACE],
    }
    queryClient.setQueryData(AUTH_ME_QUERY_KEY, initialMe)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const recordedCalls: { method: string; path: string; body: unknown }[] = []
    setMockTransport((endpoint, options) => {
      recordedCalls.push({ method: endpoint.method, path: endpoint.path, body: options.body })
      return null
    })

    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)

    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))
    const input = await screen.findByPlaceholderText('acme-corp')
    fireEvent.change(input, { target: { value: 'acme-corp' } })

    fireEvent.click(
      screen.getByRole('button', { name: 'Я понимаю последствия, удалить воркспейс' }),
    )

    await waitFor(() => {
      expect(recordedCalls).toEqual([
        {
          method: 'DELETE',
          path: '/workspaces/123e4567-e89b-12d3-a456-426614174000',
          body: { confirmation_name: 'acme-corp' },
        },
      ])
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: AUTH_ME_QUERY_KEY })
      expect(screen.queryByText('Удаление воркспейса')).toBeNull()
    })
  })

  it('shows localized nameMismatch message on 422 workspace_name_mismatch', async () => {
    setMockTransport(() => {
      throw new ApiError(422, 'Unprocessable Entity', { detail: 'workspace_name_mismatch' })
    })

    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))

    const input = await screen.findByPlaceholderText('acme-corp')
    fireEvent.change(input, { target: { value: 'acme-corp' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'Я понимаю последствия, удалить воркспейс' }),
    )

    expect(await screen.findByText('Введенное имя не совпадает с именем воркспейса')).toBeTruthy()
  })

  it.each([
    ['403 forbidden', new ApiError(403, 'Forbidden', { detail: 'workspace_owner_required' })],
    ['500 error', new ApiError(500, 'Internal Server Error', { detail: 'raw internal trace' })],
    ['network error', new Error('raw connection reset message')],
  ] as const)('shows localized deleteFailed without raw message on %s', async (_label, err) => {
    setMockTransport(() => {
      throw err
    })

    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))

    const input = await screen.findByPlaceholderText('acme-corp')
    fireEvent.change(input, { target: { value: 'acme-corp' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'Я понимаю последствия, удалить воркспейс' }),
    )

    expect(await screen.findByText('Не удалось удалить воркспейс')).toBeTruthy()
    expect(screen.queryByText(/raw internal trace|raw connection reset/i)).toBeNull()
  })
})
