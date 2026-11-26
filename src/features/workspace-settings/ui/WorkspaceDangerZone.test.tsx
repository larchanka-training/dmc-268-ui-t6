// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App, ConfigProvider } from 'antd'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH_ME_QUERY_KEY, type Me, type Workspace } from '../../../entities/user'
import { ApiError, setMockTransport } from '../../../shared/api/client'
import { WORKSPACE_NAME_MISMATCH_DETAIL } from '../model/schemas'
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

async function openAndConfirm(name: string, inputName: string = name) {
  fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))
  const input = await screen.findByPlaceholderText(name)
  fireEvent.change(input, { target: { value: inputName } })
  const confirmBtn = screen.getByRole('button', {
    name: 'Я понимаю последствия, удалить воркспейс',
  })
  fireEvent.click(confirmBtn)
  return { input, confirmBtn, dialog: screen.getByRole('dialog') }
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

  it('renders Danger Zone section and active button for owner', () => {
    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)

    expect(screen.getByText(/Danger Zone/i)).toBeTruthy()
    const deleteBtn = screen.getByRole('button', { name: 'Удалить этот воркспейс' })
    expect(deleteBtn.hasAttribute('disabled')).toBe(false)
  })

  it.each(NON_OWNER_WORKSPACES)(
    'renders disabled button with non-owner explanation for role $role',
    (workspace) => {
      renderWithProviders(<WorkspaceDangerZone workspace={workspace} />)

      const deleteBtn = screen.getByRole('button', { name: 'Удалить этот воркспейс' })
      expect(deleteBtn.hasAttribute('disabled')).toBe(true)

      const reasonId = deleteBtn.getAttribute('aria-describedby')
      expect(reasonId).toBeTruthy()
      const reasonEl = reasonId ? document.getElementById(reasonId) : null
      expect(reasonEl).toBeTruthy()
      expect(reasonEl?.textContent).toMatch(
        /только владелец воркспейса \(owner\) может удалить его/i,
      )
    },
  )

  it.each(MISSING_ROLE_WORKSPACES)(
    'fails closed and disables button when role is null or undefined ($name)',
    (workspace) => {
      renderWithProviders(<WorkspaceDangerZone workspace={workspace} />)

      const deleteBtn = screen.getByRole('button', { name: 'Удалить этот воркспейс' })
      expect(deleteBtn.hasAttribute('disabled')).toBe(true)

      const reasonId = deleteBtn.getAttribute('aria-describedby')
      expect(reasonId).toBeTruthy()
      const reasonEl = reasonId ? document.getElementById(reasonId) : null
      expect(reasonEl).toBeTruthy()
      expect(reasonEl?.textContent).toMatch(/роль в воркспейсе не определена, удаление недоступно/i)
    },
  )

  it('opens confirmation modal on delete click with warnings and disabled confirm button', async () => {
    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)

    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))

    expect(await screen.findByText('Удаление воркспейса')).toBeTruthy()
    expect(screen.getByText(/Немедленная отмена подписки в Stripe/i)).toBeTruthy()
    expect(screen.getByText(/Аннулирование текущего неизрасходованного баланса/i)).toBeTruthy()
    expect(screen.getByText(/Безвозвратное удаление настроек, правил и кэша/i)).toBeTruthy()
    expect(screen.queryByText(/Обезличивание и архивация финансовых проводок/i)).toBeNull()

    const confirmBtn = screen.getByRole('button', {
      name: 'Я понимаю последствия, удалить воркспейс',
    })
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)

    const input = screen.getByPlaceholderText('acme-corp')
    for (const nonMatch of ['Acme-Corp', 'acme-corp ', ' acme-corp', 'acme', 'acme-corp-other']) {
      fireEvent.change(input, { target: { value: nonMatch } })
      expect(confirmBtn.hasAttribute('disabled')).toBe(true)
    }

    fireEvent.change(input, { target: { value: 'acme-corp' } })
    expect(confirmBtn.hasAttribute('disabled')).toBe(false)
  })

  it('closes modal on Escape key dispatched to dialog when not pending', async () => {
    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeDefined()

    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('closes modal on close button (cross) click when not pending', async () => {
    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))
    expect(await screen.findByRole('dialog')).toBeDefined()

    const closeButton = document.querySelector('.ant-modal-close')
    expect(closeButton).not.toBeNull()
    if (closeButton) {
      fireEvent.click(closeButton)
    }

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('closes modal on cancel button click when not pending', async () => {
    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))
    expect(await screen.findByRole('dialog')).toBeDefined()

    const cancelBtn = screen.getByRole('button', { name: 'Отмена' })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('closes modal on mask click when not pending', async () => {
    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))
    expect(await screen.findByRole('dialog')).toBeDefined()

    const mask = document.querySelector('.ant-modal-wrap')
    expect(mask).not.toBeNull()
    if (mask) {
      fireEvent.mouseDown(mask)
      fireEvent.click(mask)
    }

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('prevents close via Escape, close button, mask, or Cancel button while deletion is pending', async () => {
    let resolveDelete: ((value: unknown) => void) | undefined
    setMockTransport(() => {
      return new Promise((resolve) => {
        resolveDelete = resolve
      })
    })

    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    const { input, confirmBtn, dialog } = await openAndConfirm('acme-corp')

    await waitFor(() => {
      expect(resolveDelete).toBeDefined()
    })

    // 1. Close cross is removed (closable={false})
    expect(document.querySelector('.ant-modal-close')).toBeNull()

    // 2. Cancel button is aria-disabled and input is readOnly (preserving focus without dropping to body)
    const cancelBtn = screen.getByRole('button', { name: 'Отмена' })
    expect(cancelBtn.getAttribute('aria-disabled')).toBe('true')
    expect(cancelBtn.hasAttribute('disabled')).toBe(false)
    expect(input.hasAttribute('readonly')).toBe(true)
    expect(input.hasAttribute('disabled')).toBe(false)
    expect(confirmBtn.getAttribute('aria-disabled')).toBe('true')
    expect(confirmBtn.hasAttribute('disabled')).toBe(false)

    // Clicking cancel while pending does not dismiss modal
    fireEvent.click(cancelBtn)
    expect(screen.getByRole('dialog')).toBeDefined()

    // 3. Escape sent to dialog does NOT close modal
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
    expect(screen.getByRole('dialog')).toBeDefined()

    // 4. Clicking mask does NOT close modal
    const mask = document.querySelector('.ant-modal-wrap')
    expect(mask).not.toBeNull()
    if (mask) {
      fireEvent.mouseDown(mask)
      fireEvent.click(mask)
    }
    expect(screen.getByRole('dialog')).toBeDefined()

    // 5. Resolving mutation completes deletion and closes modal
    act(() => {
      resolveDelete?.(null)
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
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
    await openAndConfirm('acme-corp')

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
      throw new ApiError(422, 'Unprocessable Entity', { detail: WORKSPACE_NAME_MISMATCH_DETAIL })
    })

    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    await openAndConfirm('acme-corp')

    expect(await screen.findByText('Введенное имя не совпадает с именем воркспейса')).toBeTruthy()
  })

  it.each([
    [
      '403 forbidden',
      new ApiError(403, 'Forbidden', { detail: 'only workspace owner can delete workspace' }),
    ],
    [
      '422 validation error',
      new ApiError(422, 'Unprocessable Entity', {
        detail: [
          { loc: ['body', 'confirmation_name'], msg: 'too short', type: 'string_too_short' },
        ],
      }),
    ],
    ['500 error', new ApiError(500, 'Internal Server Error', { detail: 'raw internal trace' })],
    ['network error', new Error('raw connection reset message')],
  ])('shows localized deleteFailed without raw message on %s', async (_label, err) => {
    setMockTransport(() => {
      throw err
    })

    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    await openAndConfirm('acme-corp')

    expect(await screen.findByText('Не удалось удалить воркспейс')).toBeTruthy()
    expect(screen.queryByText(/raw internal trace|raw connection reset/i)).toBeNull()
  })

  it('matches workspace name containing spaces and dashes', async () => {
    const spaceWorkspace: Workspace = {
      id: '423e4567-e89b-12d3-a456-426614174999',
      name: 'Acme Corp - Global',
      installationId: 999,
      role: 'owner',
    }

    renderWithProviders(<WorkspaceDangerZone workspace={spaceWorkspace} />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))

    const input = await screen.findByPlaceholderText('Acme Corp - Global')
    const confirmBtn = screen.getByRole('button', {
      name: 'Я понимаю последствия, удалить воркспейс',
    })

    expect(confirmBtn.hasAttribute('disabled')).toBe(true)

    fireEvent.change(input, { target: { value: 'Acme Corp' } })
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)

    fireEvent.change(input, { target: { value: 'Acme Corp - Global' } })
    expect(confirmBtn.hasAttribute('disabled')).toBe(false)
  })

  it('calls onDeleted once, after the dialog is gone', async () => {
    setMockTransport(() => null)
    let dialogAtCall: HTMLElement | null | undefined
    const onDeleted = vi.fn(() => {
      dialogAtCall = screen.queryByRole('dialog')
    })

    renderWithProviders(<WorkspaceDangerZone onDeleted={onDeleted} workspace={OWNER_WORKSPACE} />)
    await openAndConfirm('acme-corp')

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(1)
    })
    expect(dialogAtCall).toBeNull()
  })

  it('does not call onDeleted when the delete fails and the dialog is cancelled', async () => {
    setMockTransport(() => {
      throw new ApiError(500, 'Internal Server Error', { detail: 'raw internal trace' })
    })
    const onDeleted = vi.fn()

    renderWithProviders(<WorkspaceDangerZone onDeleted={onDeleted} workspace={OWNER_WORKSPACE} />)
    await openAndConfirm('acme-corp')
    await screen.findByText('Не удалось удалить воркспейс')
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('calls onDeleted when the danger zone leaves before the dialog has closed', async () => {
    setMockTransport(() => null)
    const onDeleted = vi.fn()

    // With motion on, jsdom never ends the closing animation, so `afterClose` does not run.
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <App>
          <WorkspaceDangerZone onDeleted={onDeleted} workspace={OWNER_WORKSPACE} />
        </App>
      </QueryClientProvider>,
    )
    await openAndConfirm('acme-corp')
    await screen.findByText('Воркспейс успешно удален')
    expect(onDeleted).not.toHaveBeenCalled()

    unmount()
    expect(onDeleted).toHaveBeenCalledTimes(1)
  })

  it('keeps the workspace the dialog was opened for when the current one changes', async () => {
    const dangerZone = (workspace: Workspace) => (
      <ConfigProvider theme={{ token: { motion: false } }}>
        <QueryClientProvider client={queryClient}>
          <App>
            <WorkspaceDangerZone workspace={workspace} />
          </App>
        </QueryClientProvider>
      </ConfigProvider>
    )
    const otherWorkspace: Workspace = {
      ...OWNER_WORKSPACE,
      id: '423e4567-e89b-12d3-a456-426614174000',
      name: 'other-corp',
    }
    const { rerender } = render(dangerZone(otherWorkspace))
    rerender(dangerZone(OWNER_WORKSPACE))
    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))
    await screen.findByPlaceholderText('acme-corp')

    rerender(dangerZone(otherWorkspace))

    expect(screen.getByPlaceholderText('acme-corp')).toBeTruthy()
    expect(screen.queryByPlaceholderText('other-corp')).toBeNull()
  })

  it('clears the typed name and the error when the dialog is cancelled and opened again', async () => {
    setMockTransport(() => {
      throw new ApiError(500, 'Internal Server Error', { detail: 'raw internal trace' })
    })

    renderWithProviders(<WorkspaceDangerZone workspace={OWNER_WORKSPACE} />)
    await openAndConfirm('acme-corp')
    await screen.findByText('Не удалось удалить воркспейс')
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))
    const input = await screen.findByPlaceholderText('acme-corp')
    expect((input as HTMLInputElement).value).toBe('')
    expect(screen.queryByText('Не удалось удалить воркспейс')).toBeNull()
  })
})
