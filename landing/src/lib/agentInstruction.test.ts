import { expect, it } from 'vitest'

import { buildAgentInstruction } from './agentInstruction'

it('uses the configured App and app origin for the copied instruction', () => {
  const instruction = buildAgentInstruction(
    'dmc268-t6-reviewer',
    'https://app.example.com/dashboard',
  )

  expect(instruction).toContain('https://github.com/apps/dmc268-t6-reviewer/installations/new')
  expect(instruction).toContain('https://app.example.com/api/agent/instructions')
})

it.each(['', 'Bad Slug/../x', '../reviewer', 'reviewer.example'])(
  'rejects an unsafe GitHub App slug %j',
  (slug) => {
    expect(buildAgentInstruction(slug, 'https://app.example.com')).toBeNull()
  },
)
