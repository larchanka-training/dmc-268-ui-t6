import { describe, expect, it } from 'vitest'

import { SEVERITY_THRESHOLD_OPTIONS, keptSeverities } from './severityThreshold'

describe('keptSeverities', () => {
  // The literal table of brief D3: a threshold keeps the levels of the badge groups at or above it.
  it.each([
    ['all', ['critical', 'high', 'medium', 'low', 'info']],
    ['warning', ['critical', 'high', 'medium', 'low']],
    ['critical', ['critical', 'high']],
  ] as const)('keeps %s -> %j', (threshold, expected) => {
    expect(keptSeverities(threshold)).toEqual(expected)
  })
})

describe('SEVERITY_THRESHOLD_OPTIONS', () => {
  it('lists All, Warn & Crit and Only Critical with the wire value of each', () => {
    expect(
      SEVERITY_THRESHOLD_OPTIONS.map(({ value, label, levels }) => ({ value, label, levels })),
    ).toEqual([
      { value: 'all', label: 'All', levels: ['critical', 'high', 'medium', 'low', 'info'] },
      { value: 'warning', label: 'Warn & Crit', levels: ['critical', 'high', 'medium', 'low'] },
      { value: 'critical', label: 'Only Critical', levels: ['critical', 'high'] },
    ])
  })
})
