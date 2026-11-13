// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as agentTokensApi from '../api/agentTokens'
import { ApiError } from '../../../shared/api/client'
import { AgentTokensDialog } from './AgentTokensDialog'

const TOKEN_ID = '00000000-0000-4000-8000-000000000001'
const TOKEN = {
  id: TOKEN_ID,
  repository: 'octo/repo',
  createdAt: '2026-11-05T12:00:00Z',
  expiresAt: '2026-12-05T12:00:00Z',
}

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <AgentTokensDialog onClose={() => undefined} />
    </QueryClientProvider>,
  )
  return queryClient
}

function confirmation() {
  const dialog = screen
    .getByText('Отозвать этот токен агента?', {
      selector: '.ant-modal-confirm-title',
    })
    .closest('[role="dialog"]')
  if (!dialog) throw new Error('Confirmation dialog is missing')
  return within(dialog as HTMLElement)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AgentTokensDialog', () => {
  it('lets the owner find and revoke an active token', async () => {
    const list = vi
      .spyOn(agentTokensApi, 'listAgentTokens')
      .mockResolvedValueOnce([TOKEN])
      .mockResolvedValueOnce([])
    const revoke = vi.spyOn(agentTokensApi, 'revokeAgentToken').mockResolvedValue()
    const queryClient = renderDialog()

    expect(await screen.findByText('octo/repo')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Отозвать' }))
    expect(confirmation().getByRole('button', { name: 'Отозвать' })).toBeDefined()
    fireEvent.click(confirmation().getByRole('button', { name: 'Отозвать' }))

    await waitFor(() => {
      expect(revoke.mock.calls[0]?.[0]).toBe(TOKEN_ID)
    })
    expect(await screen.findByText('Активных токенов агента нет')).toBeDefined()
    expect(list).toHaveBeenCalledTimes(2)
    queryClient.clear()
  })

  it('retries a failed list request', async () => {
    const list = vi
      .spyOn(agentTokensApi, 'listAgentTokens')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([TOKEN])
    const queryClient = renderDialog()

    expect(await screen.findByText('Не удалось загрузить токены агента')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText(TOKEN.repository)).toBeDefined()
    expect(list).toHaveBeenCalledTimes(2)
    queryClient.clear()
  })

  it('keeps a token when confirmation is cancelled', async () => {
    vi.spyOn(agentTokensApi, 'listAgentTokens').mockResolvedValue([TOKEN])
    const revoke = vi.spyOn(agentTokensApi, 'revokeAgentToken').mockResolvedValue()
    const queryClient = renderDialog()

    expect(await screen.findByText(TOKEN.repository)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Отозвать' }))
    fireEvent.click(confirmation().getByRole('button', { name: 'Отмена' }))
    expect(revoke).not.toHaveBeenCalled()
    expect(screen.getByText(TOKEN.repository)).toBeDefined()
    queryClient.clear()
  })

  it('refreshes the list after a 404 revoke response', async () => {
    const list = vi
      .spyOn(agentTokensApi, 'listAgentTokens')
      .mockResolvedValueOnce([TOKEN])
      .mockResolvedValueOnce([])
    vi.spyOn(agentTokensApi, 'revokeAgentToken').mockRejectedValue(
      new ApiError(404, 'Not Found', { detail: 'token_not_found' }),
    )
    const queryClient = renderDialog()

    expect(await screen.findByText(TOKEN.repository)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Отозвать' }))
    fireEvent.click(confirmation().getByRole('button', { name: 'Отозвать' }))
    expect(await screen.findByText('Активных токенов агента нет')).toBeDefined()
    expect(list).toHaveBeenCalledTimes(2)
    queryClient.clear()
  })
})
