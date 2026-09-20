export type HttpMethod = 'GET' | 'POST'

export interface Endpoint {
  method: HttpMethod
  path: string
}

export const endpoints = {
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
  },
  stream: (): Endpoint => ({ method: 'GET', path: '/stream' }),
} as const

export function resolveUrl(base: string, endpoint: Endpoint): string {
  return `${base.replace(/\/$/, '')}${endpoint.path}`
}
