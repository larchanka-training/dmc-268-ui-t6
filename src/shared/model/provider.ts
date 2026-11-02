import { z } from 'zod'

export const VcsProviderSchema = z.enum(['github', 'gitlab', 'bitbucket'])
export type VcsProvider = z.infer<typeof VcsProviderSchema>

export const VCS_PROVIDER_LABEL: Record<VcsProvider, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
}

export const VCS_ACCESS_NAME: Record<VcsProvider, string> = {
  github: 'GitHub App',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket Cloud',
}
