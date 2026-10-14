import { describe, expect, it } from 'vitest'

import { RulesStatusSchema } from '../../entities/repository'
import { mockRepositories } from './app-state'
import { mockRulesStatuses } from './mockRulesStatus'

function repoByName(name: string) {
  const repo = mockRepositories.find((item) => item.fullName.endsWith(name))
  if (repo === undefined) {
    throw new Error(`mock repository missing: ${name}`)
  }
  return repo
}

function statusOf(name: string) {
  const status = mockRulesStatuses[repoByName(name).id]
  if (status === undefined) {
    throw new Error(`no rules status for ${name}`)
  }
  return status
}

describe('mockRulesStatuses', () => {
  it('has a valid status for every mock repository and for nothing else', () => {
    expect(Object.keys(mockRulesStatuses).sort()).toEqual(
      mockRepositories.map((repo) => repo.id).sort(),
    )
    for (const status of Object.values(mockRulesStatuses)) {
      expect(RulesStatusSchema.safeParse(status).success).toBe(true)
    }
  })

  it('covers the four states, one repository each', () => {
    expect(statusOf('dmc-268-ui-t6').status).toBe('present')
    expect(statusOf('dmc-268-api-t6').status).toBe('invalid')
    expect(statusOf('dmc-268-infra-t6').status).toBe('unavailable')
    expect(statusOf('dmc-268-docs-t6').status).toBe('missing')
  })

  it('reads the present file from a branch other than the default one', () => {
    const status = statusOf('dmc-268-ui-t6')
    if (status.status !== 'present') {
      throw new Error('ui-t6 must have a present status')
    }

    expect(status.branch).not.toBe(repoByName('dmc-268-ui-t6').defaultBranch)
    expect(status.text).toContain('```review-ignore')
    expect(status.ignoreMasks.length).toBeGreaterThan(0)
    for (const mask of status.ignoreMasks) {
      expect(status.text).toContain(mask)
    }
  })

  it('points the invalid diagnostic at the bad mask line of the text', () => {
    const status = statusOf('dmc-268-api-t6')
    if (status.status !== 'invalid' || status.text === null) {
      throw new Error('api-t6 must have an invalid status with a text')
    }
    const [diagnostic] = status.diagnostics

    expect(diagnostic?.code).toBe('policy_ignore_pattern_invalid')
    expect(diagnostic?.retryable).toBe(false)
    expect(diagnostic?.line).not.toBeNull()
    expect(status.text.split('\n')[(diagnostic?.line ?? 0) - 1]).toBe('src/[generated/**')
  })

  it('refuses access to infra-t6 without a revision and without a retry', () => {
    const status = statusOf('dmc-268-infra-t6')
    if (status.status !== 'unavailable') {
      throw new Error('infra-t6 must have an unavailable status')
    }

    expect(status.sha).toBeNull()
    expect(status.diagnostics).toHaveLength(1)
    expect(status.diagnostics[0]).toMatchObject({ code: 'policy_access_denied', retryable: false })
  })

  it('carries the defaults version of the repository without a rules file', () => {
    const status = statusOf('dmc-268-docs-t6')
    if (status.status !== 'missing') {
      throw new Error('docs-t6 must have a missing status')
    }

    expect(status.defaultsVersion).not.toBe('')
  })
})
