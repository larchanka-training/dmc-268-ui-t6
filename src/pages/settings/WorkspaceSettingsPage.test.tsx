// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH_ME_QUERY_KEY, MeSchema } from '../../entities/user'
import { useAuthStore } from '../../features/auth'
import { useWorkspaceStore } from '../../features/workspace'
import { setMockTransport } from '../../shared/api/client'
import { WorkspaceSettingsPage } from './WorkspaceSettingsPage'

const MOCK_WORKSPACE_ID = '123e4567-e89b-12d3-a456-426614174000'

const TEAM_PLACEHOLDER = /здесь будет доступно управление командой/i
const TEAM_NO_ACCESS = /управление участниками и ролями доступно только владельцу/i
const BILLING_PLACEHOLDER = /здесь будут отображаться баланс/i
const BILLING_NO_ACCESS =
  /управление тарифом и пополнение баланса доступны ролям owner, admin и billing/i
const READ_ONLY_NOTICE = /роль в workspace недоступна — только чтение/i

function buildMe(workspaces: unknown[]) {
  return MeSchema.parse({
    id: 114473628,
    login: 'testuser',
    name: 'Test User',
    avatarUrl: null,
    workspaces,
  })
}

function renderWithClient(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return render(<WorkspaceSettingsPage />, { wrapper: Wrapper })
}

function renderPage(options?: {
  role?: string | null
  omitRole?: boolean
  workspaceName?: string
  emptyWorkspaces?: boolean
  status?: 'pending' | 'error' | 'success'
}) {
  const {
    role,
    omitRole = false,
    workspaceName = 'Demo Workspace',
    emptyWorkspaces = false,
    status = 'success',
  } = options ?? {}

  useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })
  useWorkspaceStore.setState({ selectedId: null })

  const workspace = omitRole
    ? {
        id: MOCK_WORKSPACE_ID,
        name: workspaceName,
        installationId: 98765,
      }
    : {
        id: MOCK_WORKSPACE_ID,
        name: workspaceName,
        installationId: 98765,
        role,
      }

  const me = buildMe(emptyWorkspaces ? [] : [workspace])
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  if (status === 'pending') {
    setMockTransport(() => new Promise<never>(() => undefined))
  } else if (status === 'error') {
    setMockTransport((endpoint) => {
      if (endpoint.path === '/auth/me') {
        throw new Error('Network error')
      }
      throw new Error(`Unexpected endpoint ${endpoint.path}`)
    })
  } else {
    client.setQueryData(AUTH_ME_QUERY_KEY, me)
  }

  return renderWithClient(client)
}

describe('WorkspaceSettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useWorkspaceStore.setState({ selectedId: null })
  })

  afterEach(() => {
    cleanup()
    setMockTransport(null)
  })

  it('renders skeleton during initial pending loading state', () => {
    const { container } = renderPage({ status: 'pending' })
    expect(screen.getByRole('heading', { name: /настройки workspace/i })).toBeDefined()
    expect(container.querySelector('.ant-skeleton')).not.toBeNull()
    expect(screen.queryByText(/workspace не выбран/i)).toBeNull()
    expect(screen.queryByText(/общие сведения/i)).toBeNull()
  })

  it('renders error alert when /auth/me fails', async () => {
    renderPage({ status: 'error' })
    expect(screen.getByRole('heading', { name: /настройки workspace/i })).toBeDefined()
    expect(await screen.findByText(/ошибка загрузки данных/i)).toBeDefined()
    expect(screen.getByText(/не удалось загрузить данные workspace/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /повторить попытку/i })).toBeDefined()
    expect(screen.queryByText(/workspace не выбран/i)).toBeNull()
    expect(screen.queryByText(/общие сведения/i)).toBeNull()
  })

  it('retries loading and transitions to content when "Повторить попытку" is clicked', async () => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })
    useWorkspaceStore.setState({ selectedId: null })

    const workspace = {
      id: MOCK_WORKSPACE_ID,
      name: 'Recovered Workspace',
      installationId: 98765,
      role: 'owner',
    }
    const me = buildMe([workspace])

    let fail = true
    setMockTransport((endpoint) => {
      if (endpoint.path === '/auth/me') {
        if (fail) {
          throw new Error('Network error')
        }
        return me
      }
      throw new Error(`Unexpected endpoint ${endpoint.path}`)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    renderWithClient(client)

    expect(await screen.findByText(/ошибка загрузки данных/i)).toBeDefined()
    const retryButton = screen.getByRole('button', { name: /повторить попытку/i })

    fail = false
    fireEvent.click(retryButton)

    expect(await screen.findByText('Recovered Workspace')).toBeDefined()
    expect(screen.queryByText(/ошибка загрузки данных/i)).toBeNull()
  })

  it('keeps existing settings visible when background refetch fails', async () => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })
    useWorkspaceStore.setState({ selectedId: null })

    const workspace = {
      id: MOCK_WORKSPACE_ID,
      name: 'Stable Workspace',
      installationId: 98765,
      role: 'owner',
    }
    const me = buildMe([workspace])

    setMockTransport((endpoint) => {
      if (endpoint.path === '/auth/me') {
        throw new Error('Background refetch failed')
      }
      throw new Error(`Unexpected endpoint ${endpoint.path}`)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(AUTH_ME_QUERY_KEY, me)

    renderWithClient(client)

    expect(screen.getByText('Stable Workspace')).toBeDefined()

    await client.refetchQueries({ queryKey: AUTH_ME_QUERY_KEY })

    await waitFor(() => {
      expect(client.getQueryState(AUTH_ME_QUERY_KEY)?.status).toBe('error')
    })
    await waitFor(() => {
      expect(screen.getByText('Stable Workspace')).toBeDefined()
      expect(screen.queryByText(/ошибка загрузки данных/i)).toBeNull()
    })
  })

  it('renders empty state when no workspace is available', () => {
    renderPage({ emptyWorkspaces: true })
    expect(screen.getByRole('heading', { name: /настройки workspace/i })).toBeDefined()
    expect(screen.getByText(/workspace не выбран/i)).toBeDefined()
    expect(screen.queryByText(/общие сведения/i)).toBeNull()
    expect(screen.queryByText(/команда и доступ/i)).toBeNull()
    expect(screen.queryByText(/баланс и тариф/i)).toBeNull()
  })

  it('renders general workspace info and does not include Danger Zone', () => {
    renderPage({ role: 'owner', workspaceName: 'Acme Corp' })
    expect(screen.getByRole('heading', { name: /настройки workspace/i })).toBeDefined()
    expect(screen.getByText('Acme Corp')).toBeDefined()
    expect(screen.getByText(MOCK_WORKSPACE_ID)).toBeDefined()
    expect(screen.getByText('98765')).toBeDefined()
    expect(screen.queryByText(/опасная зона/i)).toBeNull()
  })

  it('displays full access for owner role across team and billing sections', () => {
    renderPage({ role: 'owner' })
    expect(screen.getByText(/владелец/i)).toBeDefined()
    expect(screen.getByText(/команда и доступ/i)).toBeDefined()
    expect(screen.getByText(TEAM_PLACEHOLDER)).toBeDefined()
    expect(screen.queryByText(TEAM_NO_ACCESS)).toBeNull()
    expect(screen.getByText(/баланс и тариф/i)).toBeDefined()
    expect(screen.getByText(BILLING_PLACEHOLDER)).toBeDefined()
    expect(screen.queryByText(BILLING_NO_ACCESS)).toBeNull()
    expect(screen.queryByText(READ_ONLY_NOTICE)).toBeNull()
  })

  it('displays admin permissions with both team and billing accessible', () => {
    renderPage({ role: 'admin' })
    expect(screen.getByText(/администратор/i)).toBeDefined()
    expect(screen.getByText(TEAM_PLACEHOLDER)).toBeDefined()
    expect(screen.queryByText(TEAM_NO_ACCESS)).toBeNull()
    expect(screen.getByText(BILLING_PLACEHOLDER)).toBeDefined()
    expect(screen.queryByText(BILLING_NO_ACCESS)).toBeNull()
    expect(screen.queryByText(READ_ONLY_NOTICE)).toBeNull()
  })

  it('displays billing permissions: billing accessible, team restricted', () => {
    renderPage({ role: 'billing' })
    expect(screen.getByText(/биллинг/i)).toBeDefined()
    expect(screen.getByText(TEAM_NO_ACCESS)).toBeDefined()
    expect(screen.queryByText(TEAM_PLACEHOLDER)).toBeNull()
    expect(screen.getByText(BILLING_PLACEHOLDER)).toBeDefined()
    expect(screen.queryByText(BILLING_NO_ACCESS)).toBeNull()
    expect(screen.queryByText(READ_ONLY_NOTICE)).toBeNull()
  })

  it('displays member permissions: team restricted, billing view accessible per ADR 0002 §11.1', () => {
    renderPage({ role: 'member' })
    expect(screen.getByText(/участник \(member\)/i)).toBeDefined()
    expect(screen.getByText(TEAM_NO_ACCESS)).toBeDefined()
    expect(screen.queryByText(TEAM_PLACEHOLDER)).toBeNull()
    expect(screen.getByText(BILLING_PLACEHOLDER)).toBeDefined()
    expect(screen.queryByText(BILLING_NO_ACCESS)).toBeNull()
    expect(screen.queryByText(READ_ONLY_NOTICE)).toBeNull()
  })

  it('reads role from the currently selected workspace instead of workspaces[0]', () => {
    const wsOwner = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Owner Workspace',
      installationId: 1001,
      role: 'owner',
    }
    const wsMember = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Member Workspace',
      installationId: 1002,
      role: 'member',
    }

    useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })
    useWorkspaceStore.getState().select(wsMember.id)

    const me = buildMe([wsOwner, wsMember])

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(AUTH_ME_QUERY_KEY, me)

    renderWithClient(client)

    expect(screen.getByText('Member Workspace')).toBeDefined()
    expect(screen.getByText(/участник \(member\)/i)).toBeDefined()
    expect(screen.getByText(TEAM_NO_ACCESS)).toBeDefined()
    expect(screen.queryByText(TEAM_PLACEHOLDER)).toBeNull()
  })

  it.each([
    {
      opts: { role: 'owner' as const },
      label: /владелец \(owner\)/i,
      tone: 'warning',
      variant: 'dot',
    },
    {
      opts: { role: 'admin' as const },
      label: /администратор \(admin\)/i,
      tone: 'info',
      variant: 'dot',
    },
    {
      opts: { role: 'billing' as const },
      label: /биллинг \(billing\)/i,
      tone: 'success',
      variant: 'dot',
    },
    {
      opts: { role: 'member' as const },
      label: /участник \(member\)/i,
      tone: 'neutral',
      variant: 'dot',
    },
    { opts: { role: null }, label: 'Только чтение', tone: 'neutral', variant: 'outline' },
    { opts: { omitRole: true }, label: 'Только чтение', tone: 'neutral', variant: 'outline' },
    {
      opts: { role: 'future_custom_role' },
      label: 'Только чтение',
      tone: 'neutral',
      variant: 'outline',
    },
  ])('renders role tag metadata for $opts', ({ opts, label, tone, variant }) => {
    renderPage(opts)
    const tag = screen.getByText(label)
    expect(tag.getAttribute('data-tone')).toBe(tone)
    expect(tag.getAttribute('data-variant')).toBe(variant)
  })

  it.each([
    ['null role', { role: null }],
    ['omitted role (undefined)', { omitRole: true }],
    ['unknown role fallback', { role: 'future_custom_role' }],
  ])('handles %s safely in read-only mode', (_label, opts) => {
    renderPage(opts)
    expect(screen.getByText('Только чтение')).toBeDefined()
    expect(screen.getByText(READ_ONLY_NOTICE)).toBeDefined()
    expect(screen.getByText(TEAM_NO_ACCESS)).toBeDefined()
    expect(screen.queryByText(TEAM_PLACEHOLDER)).toBeNull()
    expect(screen.getByText(BILLING_PLACEHOLDER)).toBeDefined()
    expect(screen.queryByText(BILLING_NO_ACCESS)).toBeNull()
  })
})
