// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'

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
  const router = createMemoryRouter([{ path: '/', element: <RunControls run={terminalRun} /> }], {
    initialEntries: ['/'],
  })
  return render(<RouterProvider router={router} />)
}

const activeRun: RunSession = {
  ...terminalRun,
  status: 'running',
  finishedAt: null,
}

function renderActiveControls() {
  const router = createMemoryRouter([{ path: '/', element: <RunControls run={activeRun} /> }], {
    initialEntries: ['/'],
  })
  return render(<RouterProvider router={router} />)
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
      expect(screen.getByText('У этого PR уже есть активный прогон или PR закрыт')).toBeTruthy()
    })
  })

  it('surfaces cancel 409 conflicts via antd message', async () => {
    mockCancelMutate.mockImplementation(
      (_vars: undefined, options?: { onError?: (error: unknown) => void }) => {
        options?.onError?.(new ApiError(409, 'Conflict', { detail: 'Active run already exists' }))
      },
    )

    renderActiveControls()
    fireEvent.click(screen.getByText('Отменить'))

    await waitFor(() => {
      expect(screen.getByText('У этого PR уже есть активный прогон или PR закрыт')).toBeTruthy()
    })
  })
})
