import { expect, it } from 'vitest'

import { buildAgentInstruction } from './agentInstruction'

it('uses the configured App and app origin for the copied instruction', () => {
  const instruction = buildAgentInstruction(
    'dmc268-t6-reviewer',
    'https://app.example.com/dashboard',
  )

  expect(instruction).toBe(
    'Connect AI Code Reviewer to this GitHub repository. If needed, ask me to install its GitHub App at https://github.com/apps/dmc268-t6-reviewer/installations/new. Then read and follow https://app.example.com/api/agent/instructions. Ask me to approve GitHub access, confirm the review settings, and select a test PR for the first review.',
  )
})

it.each([
  undefined,
  '',
  '-a',
  'a--b',
  'Reviewer',
  'Bad Slug/../x',
  '../reviewer',
  'reviewer.example',
])('rejects an unsafe GitHub App slug %j', (slug) => {
  expect(buildAgentInstruction(slug, 'https://app.example.com')).toBeNull()
})
