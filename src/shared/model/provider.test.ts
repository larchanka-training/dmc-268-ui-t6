import { describe, expect, it } from 'vitest'

import { VCS_ACCESS_NAME, VCS_PROVIDER_LABEL, VcsProviderSchema } from './provider'

describe('VCS provider names', () => {
  it('labels all wire providers and distinguishes access names from compact labels', () => {
    expect(VcsProviderSchema.options).toEqual(['github', 'gitlab', 'bitbucket'])
    expect(VCS_PROVIDER_LABEL).toEqual({
      github: 'GitHub',
      gitlab: 'GitLab',
      bitbucket: 'Bitbucket',
    })
    expect(VCS_ACCESS_NAME).toEqual({
      github: 'GitHub App',
      gitlab: 'GitLab',
      bitbucket: 'Bitbucket Cloud',
    })
  })
})
