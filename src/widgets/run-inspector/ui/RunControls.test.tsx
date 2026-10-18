// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'

import type { RunSession } from '../../../entities/run'
import { ApiError } from '../../../shared/api/client'
import { RunControls } from './RunControls'

const terminalRun: RunSession = {
  id: '11111111-1111-4111-8111-000000000004',
  engine: 'deep',
  model: 'claude-sonnet-5',
  status: 'succeeded',
  startedAt: '2026-09-18T11:50:00.000Z',
  finishedAt: '2026-09-18T11:55:12.000Z',
  attempt: 1,
  cancelRequested: false,
  trigger: 'webhook',
  createdAt: '2026-09-18T11:00:00.000Z',
  summaryOnly: false,
  pullRequest: {
    repo: 'org/repo',
    number: 1,
    title: 'feat',
    url: 'https://github.com/org/repo/pull/1',
    headSha: 'abcdef1234567890abcdef1234567890abcdef12',
  },
  actionCount: 1,
  errorCode: null,
}

const mockRerunMutate = vi.fn()
const mockCancelMutate = vi.fn()

vi.mock('../../../entities/run', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../entities/run')>()
  return {
    ...actual,
    useRerunRun: () => ({
      mutate: mockRerunMutate,
      isPending: false,
    }),
    useCancelRun: () => ({
      mutate: mockCancelMutate,
      isPending: false,
    }),
  }
})

function renderControls() {
  return renderControlsFor(terminalRun)
}

const activeRun: RunSession = {
  ...terminalRun,
  status: 'running',
  finishedAt: null,
}

function renderControlsFor(run: RunSession) {
  const router = createMemoryRouter([{ path: '/', element: <RunControls run={run} /> }], {
    initialEntries: ['/'],
  })
  return render(<RouterProvider router={router} />)
}

function renderActiveControls() {
  return renderControlsFor(activeRun)
}

afterEach(() => {
  cleanup()
  mockRerunMutate.mockReset()
  mockCancelMutate.mockReset()
})

describe('RunControls', () => {
  it('surfaces rerun 409 conflicts via antd message', async () => {
    mockRerunMutate.mockImplementation(
      (_vars: undefined, options?: { onError?: (error: unknown) => void }) => {
        options?.onError?.(new ApiError(409, 'Conflict', { detail: 'Active run already exists' }))
      },
    )

    renderControls()
    fireEvent.click(screen.getByText('Перезапустить'))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Нельзя перезапустить ревью: у PR уже есть активный прогон, PR закрыт, ревью репозитория приостановлено или GitHub App недоступна',
        ),
      ).toBeTruthy()
    })
  })

  it('shows the generic fallback for an unexpected cancel 409 via antd message', async () => {
    mockCancelMutate.mockImplementation(
      (_vars: undefined, options?: { onError?: (error: unknown) => void }) => {
        options?.onError?.(new ApiError(409, 'Conflict', { detail: 'Active run already exists' }))
      },
    )

    renderActiveControls()
    fireEvent.click(screen.getByText('Отменить'))

    await waitFor(() => {
      expect(screen.getByText('Не удалось выполнить операцию')).toBeTruthy()
    })
    expect(screen.queryByText('Active run already exists')).toBeNull()
    expect(screen.queryByText('У этого PR уже есть активный прогон или PR закрыт')).toBeNull()
  })

  // Fixed Russian text by status code: the api `detail` (English, or a FastAPI validation
  // array on a malformed id) never reaches the user. Payloads mirror what the api raises.
  it.each([
    { status: 404, detail: 'run not found', text: 'Прогон не найден — обновите страницу' },
    {
      status: 422,
      detail: 'the repository has no active rule or prompt version',
      text: 'Нельзя перезапустить: у репозитория нет активного правила или версии промпта',
    },
  ])('shows fixed Russian text for rerun $status', async ({ status, detail, text }) => {
    mockRerunMutate.mockImplementation(
      (_vars: undefined, options?: { onError?: (error: unknown) => void }) => {
        options?.onError?.(new ApiError(status, 'Error', { detail }))
      },
    )

    renderControls()
    fireEvent.click(screen.getByText('Перезапустить'))

    await waitFor(() => {
      expect(screen.getByText(text)).toBeTruthy()
    })
    expect(screen.queryByText(detail)).toBeNull()
  })

  it.each([
    {
      status: 404,
      data: { detail: 'run not found' },
      text: 'Прогон не найден — обновите страницу',
    },
    {
      // FastAPI path validation (a malformed id): `detail` is an array, not a string.
      status: 422,
      data: {
        detail: [
          { loc: ['path', 'run_id'], msg: 'Input should be a valid UUID', type: 'uuid_parsing' },
        ],
      },
      text: 'Сервер отклонил запрос на отмену',
    },
  ])('shows fixed Russian text for cancel $status', async ({ status, data, text }) => {
    mockCancelMutate.mockImplementation(
      (_vars: undefined, options?: { onError?: (error: unknown) => void }) => {
        options?.onError?.(new ApiError(status, 'Error', data))
      },
    )

    renderActiveControls()
    fireEvent.click(screen.getByText('Отменить'))

    await waitFor(() => {
      expect(screen.getByText(text)).toBeTruthy()
    })
    expect(screen.queryByText('run not found')).toBeNull()
  })

  it.each(['running', 'publishing'] as const)(
    'shows an aria-disabled «Отмена запрошена» instead of «Отменить» on a %s run with a cancel request',
    (status) => {
      renderControlsFor({ ...activeRun, status, cancelRequested: true })

      const button = screen.getByRole('button', { name: 'Отмена запрошена' })
      // Not natively disabled: a disabled button cannot hold the focus (frontend.md §3b item 3).
      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect((button as HTMLButtonElement).disabled).toBe(false)
      // Ant Design's own disabled class gives its disabled look; the button stays a plain
      // default one: no danger or primary style.
      expect(button.className).toContain('ant-btn-disabled')
      expect(button.className).toContain('ant-btn-color-default')
      expect(button.className).not.toContain('ant-btn-color-dangerous')
      fireEvent.click(button)
      expect(mockCancelMutate).not.toHaveBeenCalled()
      expect(screen.queryByText('Отменить')).toBeNull()
    },
  )

  it('keeps the focus on the cancel button once a cancel is requested', () => {
    const requestedRun: RunSession = { ...activeRun, cancelRequested: true }
    const { rerender } = render(
      <MemoryRouter>
        <RunControls run={activeRun} />
      </MemoryRouter>,
    )
    const cancelButton = screen.getByRole('button', { name: 'Отменить' })
    cancelButton.focus()
    expect(document.activeElement).toBe(cancelButton)

    rerender(
      <MemoryRouter>
        <RunControls run={requestedRun} />
      </MemoryRouter>,
    )

    const requestedButton = screen.getByRole('button', { name: 'Отмена запрошена' })
    expect(requestedButton).toBe(cancelButton)
    expect(document.activeElement).toBe(requestedButton)
    // jsdom keeps the focus on a button that turns disabled; a real browser drops it.
    expect((requestedButton as HTMLButtonElement).disabled).toBe(false)
  })

  // The cancel and «Перезапустить» buttons are one node: when the run turns terminal it
  // keeps the focus instead of the page falling back to the body (frontend.md §3b item 3).
  function expectFocusKeptOnRerun(before: HTMLElement): void {
    const rerunButton = screen.getByRole('button', { name: 'Перезапустить' })
    expect(rerunButton).toBe(before)
    expect(document.activeElement).toBe(rerunButton)
    // jsdom keeps the focus on a natively disabled button; a real browser drops it.
    expect((rerunButton as HTMLButtonElement).disabled).toBe(false)
  }

  it('keeps the focus on the button when a queued run is cancelled', () => {
    const { rerender } = render(
      <MemoryRouter>
        <RunControls run={{ ...activeRun, status: 'queued' }} />
      </MemoryRouter>,
    )
    const cancelButton = screen.getByRole('button', { name: 'Отменить' })
    cancelButton.focus()
    expect(document.activeElement).toBe(cancelButton)

    rerender(
      <MemoryRouter>
        <RunControls run={{ ...terminalRun, status: 'cancelled', cancelRequested: true }} />
      </MemoryRouter>,
    )

    expectFocusKeptOnRerun(cancelButton)
  })

  it.each([
    { from: 'running', to: 'cancelled' },
    { from: 'publishing', to: 'failed' },
  ] as const)(
    'keeps the focus on «Отмена запрошена» when a $from run turns $to',
    ({ from, to }) => {
      const { rerender } = render(
        <MemoryRouter>
          <RunControls run={{ ...activeRun, status: from, cancelRequested: true }} />
        </MemoryRouter>,
      )
      const requestedButton = screen.getByRole('button', { name: 'Отмена запрошена' })
      requestedButton.focus()
      expect(document.activeElement).toBe(requestedButton)

      rerender(
        <MemoryRouter>
          <RunControls run={{ ...terminalRun, status: to, cancelRequested: true }} />
        </MemoryRouter>,
      )

      expectFocusKeptOnRerun(requestedButton)
    },
  )

  it('does not touch a focus held elsewhere when the run turns terminal', () => {
    const { rerender } = render(
      <MemoryRouter>
        <RunControls run={{ ...activeRun, status: 'queued' }} />
        <button type="button">Рядом</button>
      </MemoryRouter>,
    )
    const outsideButton = screen.getByRole('button', { name: 'Рядом' })
    outsideButton.focus()
    expect(document.activeElement).toBe(outsideButton)

    rerender(
      <MemoryRouter>
        <RunControls run={{ ...terminalRun, status: 'cancelled', cancelRequested: true }} />
        <button type="button">Рядом</button>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Перезапустить' })).toBeTruthy()
    expect(document.activeElement).toBe(outsideButton)
  })

  it('shows only an enabled «Отменить» on an active run without a cancel request', () => {
    renderActiveControls()

    const button = screen.getByRole('button', { name: 'Отменить' })
    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(button.hasAttribute('aria-disabled')).toBe(false)
    expect(button.className).toContain('ant-btn-color-dangerous')
    expect(button.className).not.toContain('ant-btn-disabled')
    expect(screen.queryByText('Отмена запрошена')).toBeNull()
  })

  it('shows no cancel-side button on a terminal run even when cancelRequested is true', () => {
    renderControlsFor({
      ...terminalRun,
      status: 'cancelled',
      finishedAt: '2026-09-18T11:55:12.000Z',
      cancelRequested: true,
    })

    expect(screen.queryByText('Отмена запрошена')).toBeNull()
    expect(screen.queryByText('Отменить')).toBeNull()
    expect(screen.getByText('Перезапустить')).toBeTruthy()
  })
})
