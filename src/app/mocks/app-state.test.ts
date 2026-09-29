import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { RepositorySchema } from '../../entities/repository'
import { UserSchema } from '../../entities/user'
import { mockCurrentUser, mockRepositories, mockRunSessions } from './app-state'

describe('mock app-state schema validity', () => {
  it('validates mockRepositories against z.array(RepositorySchema)', () => {
    const result = z.array(RepositorySchema).safeParse(mockRepositories)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(mockRepositories.length)
      result.data.forEach((repo) => {
        expect(repo.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )
      })
    }
  })

  it('validates mockCurrentUser against UserSchema', () => {
    const result = UserSchema.safeParse(mockCurrentUser)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.login).toBe('skvertl')
      expect(result.data.avatarUrl).toContain('https://')
    }
  })

  it('contains valid mockRunSessions', () => {
    expect(mockRunSessions.length).toBeGreaterThan(0)
    mockRunSessions.forEach((run) => {
      expect(run.id).toBeDefined()
      expect(run.pullRequest.repo).toBe('larchanka-training/dmc-268-ui-t6')
    })
  })
})
