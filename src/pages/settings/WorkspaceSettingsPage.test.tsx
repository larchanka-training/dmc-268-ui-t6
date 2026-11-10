// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH_ME_QUERY_KEY, MeSchema } from '../../entities/user'
import { useAuthStore } from '../../features/auth'
import { WorkspaceSettingsPage } from './WorkspaceSettingsPage'

const MOCK_WORKSPACE_ID = '123e4567-e89b-12d3-a456-426614174000'

const TEAM_PLACEHOLDER = /здесь будет доступно управление командой/i
const TEAM_NO_ACCESS = /управление участниками и ролями доступно только владельцу/i
const BILLING_PLACEHOLDER = /здесь будут отображаться баланс/i
const BILLING_NO_ACCESS =
  /управление тарифом и пополнение баланса доступны ролям owner, admin и billing/i
const READ_ONLY_NOTICE = /доступ только для чтения: роль в воркспейсе не назначена/i

function renderPage(options?: {
  role?: string | null
  omitRole?: boolean
  workspaceName?: string
  emptyWorkspaces?: boolean
}) {
  const {
    role,
    omitRole = false,
    workspaceName = 'Demo Workspace',
    emptyWorkspaces = false,
  } = options ?? {}

  useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })

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

  const me = MeSchema.parse({
    id: 114473628,
    login: 'testuser',
    name: 'Test User',
    avatarUrl: null,
    workspaces: emptyWorkspaces ? [] : [workspace],
  })

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(AUTH_ME_QUERY_KEY, me)

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

  return render(<WorkspaceSettingsPage />, { wrapper: Wrapper })
}

describe('WorkspaceSettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders empty state when no workspace is available', () => {
    renderPage({ emptyWorkspaces: true })
    expect(screen.getByRole('heading', { name: /настройки workspace/i })).toBeDefined()
    expect(screen.getByText(/воркспейс не выбран/i)).toBeDefined()
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

  it('displays member permissions: team and billing show clear restrictions', () => {
    renderPage({ role: 'member' })
    expect(screen.getByText(/участник \(member\)/i)).toBeDefined()
    expect(screen.getByText(TEAM_NO_ACCESS)).toBeDefined()
    expect(screen.queryByText(TEAM_PLACEHOLDER)).toBeNull()
    expect(screen.getByText(BILLING_NO_ACCESS)).toBeDefined()
    expect(screen.queryByText(BILLING_PLACEHOLDER)).toBeNull()
    expect(screen.queryByText(READ_ONLY_NOTICE)).toBeNull()
  })

  it.each([
    ['null role', { role: null }],
    ['omitted role (undefined)', { omitRole: true }],
    ['unknown role fallback', { role: 'future_custom_role' }],
  ])('handles %s safely in read-only mode', (_label, opts) => {
    renderPage(opts)
    expect(screen.getByText(/только чтение/i)).toBeDefined()
    expect(screen.getByText(READ_ONLY_NOTICE)).toBeDefined()
    expect(screen.getByText(TEAM_NO_ACCESS)).toBeDefined()
    expect(screen.queryByText(TEAM_PLACEHOLDER)).toBeNull()
    expect(screen.getByText(BILLING_NO_ACCESS)).toBeDefined()
    expect(screen.queryByText(BILLING_PLACEHOLDER)).toBeNull()
  })
})
