import { describe, expect, it } from 'vitest'

import type { RunStatus } from '../model/schemas'
import { isActive, isStaleRunning, isTerminal, statusColor } from './status'

const ALL_STATUSES: RunStatus[] = [
  'queued',
  'running',
  'publishing',
  'succeeded',
  'failed',
  'cancelled',
  'skipped',
]

describe('isTerminal', () => {
  it('is true for succeeded, failed, cancelled, skipped', () => {
    expect(isTerminal('succeeded')).toBe(true)
    expect(isTerminal('failed')).toBe(true)
    expect(isTerminal('cancelled')).toBe(true)
    expect(isTerminal('skipped')).toBe(true)
  })

  it('is false for queued, running, publishing', () => {
    expect(isTerminal('queued')).toBe(false)
    expect(isTerminal('running')).toBe(false)
    expect(isTerminal('publishing')).toBe(false)
  })
})

describe('isActive', () => {
  it('is the complement of isTerminal over all statuses', () => {
    for (const status of ALL_STATUSES) {
      expect(isActive(status)).toBe(!isTerminal(status))
    }
  })
})

describe('isStaleRunning', () => {
  const now = new Date('2026-09-18T12:00:00.000Z')

  it('is true when running for over 10 minutes with no finishedAt', () => {
    const startedAt = new Date(now.getTime() - 40 * 60 * 1000).toISOString()
    expect(isStaleRunning({ status: 'running', startedAt, finishedAt: null }, now)).toBe(true)
  })

  it('is false when running for under 10 minutes', () => {
    const startedAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    expect(isStaleRunning({ status: 'running', startedAt, finishedAt: null }, now)).toBe(false)
  })

  it('is false for a terminal status even if old', () => {
    const startedAt = new Date(now.getTime() - 40 * 60 * 1000).toISOString()
    expect(isStaleRunning({ status: 'succeeded', startedAt, finishedAt: null }, now)).toBe(false)
  })

  it('is false when startedAt is null', () => {
    expect(isStaleRunning({ status: 'running', startedAt: null, finishedAt: null }, now)).toBe(
      false,
    )
  })
})

describe('statusColor', () => {
  it('maps known statuses to antd Tag colors', () => {
    expect(statusColor('succeeded')).toBe('success')
    expect(statusColor('failed')).toBe('error')
    expect(statusColor('running')).toBe('processing')
  })
})
