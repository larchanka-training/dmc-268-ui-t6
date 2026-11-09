// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as agentTokensApi from '../api/agentTokens'
import { AgentTokensDialog } from './AgentTokensDialog'

const TOKEN_ID = '00000000-0000-4000-8000-000000000001'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AgentTokensDialog', () => {
  it('lets the owner find and revoke an active token', async () => {
    const list = vi
      .spyOn(agentTokensApi, 'listAgentTokens')
      .mockResolvedValueOnce([
        {
          id: TOKEN_ID,
          repository: 'octo/repo',
          createdAt: '2026-11-05T12:00:00Z',
          expiresAt: '2026-12-05T12:00:00Z',
        },
      ])
      .mockResolvedValueOnce([])
    const revoke = vi.spyOn(agentTokensApi, 'revokeAgentToken').mockResolvedValue()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <AgentTokensDialog onClose={() => undefined} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('octo/repo')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Отозвать' }))
    expect(await screen.findByText('Отозвать этот токен агента?')).toBeDefined()
    const confirmButtons = screen.getAllByRole('button', { name: 'Отозвать' })
    const confirmButton = confirmButtons[confirmButtons.length - 1]
    expect(confirmButton).toBeDefined()
    if (confirmButton) fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(revoke.mock.calls[0]?.[0]).toBe(TOKEN_ID)
    })
    expect(await screen.findByText('Активных токенов агента нет')).toBeDefined()
    expect(list).toHaveBeenCalledTimes(2)
    queryClient.clear()
  })
})
