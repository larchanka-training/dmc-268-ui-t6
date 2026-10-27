export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface Endpoint {
  method: HttpMethod
  path: string
}

export const endpoints = {
  auth: {
    githubCallback: (): Endpoint => ({ method: 'POST', path: '/auth/github/callback' }),
    refresh: (): Endpoint => ({ method: 'POST', path: '/auth/refresh' }),
    me: (): Endpoint => ({ method: 'GET', path: '/auth/me' }),
    logout: (): Endpoint => ({ method: 'POST', path: '/auth/logout' }),
  },
  repos: {
    list: (): Endpoint => ({ method: 'GET', path: '/repos' }),
    detail: (id: string): Endpoint => ({ method: 'GET', path: `/repos/${id}` }),
    update: (id: string): Endpoint => ({ method: 'PATCH', path: `/repos/${id}` }),
    rulesStatus: (id: string): Endpoint => ({ method: 'GET', path: `/repos/${id}/rules-status` }),
  },
  bitbucket: {
    discover: (workspaceId: string): Endpoint => ({
      method: 'POST',
      path: `/workspaces/${workspaceId}/bitbucket/discovery`,
    }),
    connections: (workspaceId: string, cursor?: string | null): Endpoint => ({
      method: 'GET',
      path: `/workspaces/${workspaceId}/bitbucket/connections${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    }),
    connect: (workspaceId: string): Endpoint => ({
      method: 'POST',
      path: `/workspaces/${workspaceId}/bitbucket/connections`,
    }),
    rotateCredential: (workspaceId: string, installationId: string): Endpoint => ({
      method: 'PUT',
      path: `/workspaces/${workspaceId}/bitbucket/connections/${installationId}/credential`,
    }),
    disconnect: (workspaceId: string, installationId: string, repositoryId: string): Endpoint => ({
      method: 'DELETE',
      path: `/workspaces/${workspaceId}/bitbucket/connections/${installationId}/repositories/${repositoryId}`,
    }),
    rotateWebhookSecret: (
      workspaceId: string,
      installationId: string,
      repositoryId: string,
    ): Endpoint => ({
      method: 'POST',
      path: `/workspaces/${workspaceId}/bitbucket/connections/${installationId}/repositories/${repositoryId}/webhook-secret`,
    }),
  },
  runs: {
    list: (): Endpoint => ({ method: 'GET', path: '/runs' }),
    detail: (id: string): Endpoint => ({ method: 'GET', path: `/runs/${id}` }),
    actions: (id: string): Endpoint => ({ method: 'GET', path: `/runs/${id}/actions` }),
    actionResponse: (id: string, index: number): Endpoint => ({
      method: 'GET',
      path: `/runs/${id}/actions/${String(index)}/response`,
    }),
    diff: (id: string): Endpoint => ({ method: 'GET', path: `/runs/${id}/diff` }),
    comments: (id: string): Endpoint => ({ method: 'GET', path: `/runs/${id}/comments` }),
    files: (id: string): Endpoint => ({ method: 'GET', path: `/runs/${id}/files` }),
    cancel: (id: string): Endpoint => ({ method: 'POST', path: `/runs/${id}/cancel` }),
    rerun: (id: string): Endpoint => ({ method: 'POST', path: `/runs/${id}/rerun` }),
  },
  stream: (): Endpoint => ({ method: 'GET', path: '/stream' }),
} as const

export function resolveUrl(base: string, endpoint: Endpoint): string {
  return `${base.replace(/\/$/, '')}${endpoint.path}`
}
