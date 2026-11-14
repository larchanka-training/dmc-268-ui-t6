import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { loadAppUrl, resetAppUrl } from '../lib/appUrl'
import { Hero } from './Hero'

beforeEach(() => {
  resetAppUrl()
  vi.stubEnv('VITE_GITHUB_APP_SLUG', 'dmc268-t6-reviewer')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('shows one instruction with the app install and API guide URLs', async () => {
  await loadAppUrl(
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ appUrl: 'https://app.example.com/dashboard' })),
      ),
  )
  render(<Hero />)

  const instruction = screen.getByRole('textbox', {
    name: 'Prefer your coding agent? Give it this instruction.',
  })
  expect(instruction.getAttribute('value')).toContain(
    'https://github.com/apps/dmc268-t6-reviewer/installations/new',
  )
  expect(instruction.getAttribute('value')).toContain(
    'https://app.example.com/api/agent/instructions',
  )
})

it('copies the full instruction and reports success', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  render(<Hero />)

  const instruction = screen.getByRole('textbox', {
    name: 'Prefer your coding agent? Give it this instruction.',
  })
  fireEvent.click(screen.getByRole('button', { name: 'Copy agent setup instruction' }))

  expect(writeText).toHaveBeenCalledWith(instruction.getAttribute('value'))
  expect(await screen.findByText('Copied')).toBeTruthy()
})

it('does not show an incomplete instruction without a configured App slug', () => {
  vi.stubEnv('VITE_GITHUB_APP_SLUG', '')
  render(<Hero />)

  expect(
    screen.queryByRole('textbox', {
      name: 'Prefer your coding agent? Give it this instruction.',
    }),
  ).toBeNull()
})

it('does not use an invalid nonempty App slug in the copied instruction', () => {
  vi.stubEnv('VITE_GITHUB_APP_SLUG', 'Bad Slug/../x')
  render(<Hero />)

  expect(
    screen.queryByRole('textbox', {
      name: 'Prefer your coding agent? Give it this instruction.',
    }),
  ).toBeNull()
})

it('offers manual selection when clipboard write fails', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error('clipboard unavailable'))
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  render(<Hero />)
  const instruction = screen.getByRole('textbox', {
    name: 'Prefer your coding agent? Give it this instruction.',
  })

  fireEvent.click(screen.getByRole('button', { name: 'Copy agent setup instruction' }))

  expect(writeText).toHaveBeenCalledOnce()
  await screen.findByText('Select the text to copy')
  expect(screen.getByRole('status').textContent).toBe('Select the text to copy')
  expect(document.activeElement).toBe(instruction)
  expect(instruction).toHaveProperty('selectionStart', 0)
  expect(instruction).toHaveProperty(
    'selectionEnd',
    String(instruction.getAttribute('value')).length,
  )

  writeText.mockResolvedValueOnce(undefined)
  fireEvent.click(screen.getByRole('button', { name: 'Copy agent setup instruction' }))
  expect(screen.getByRole('status').textContent).toBe('')
  await screen.findByText('Copied')
  expect(screen.getByRole('status').textContent).toBe('Copied')
})
