// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { IconAnalytics, IconAudit, IconRuns } from './icons'

afterEach(() => {
  cleanup()
})

describe('navigation icons', () => {
  it.each([
    ['IconAudit', IconAudit],
    ['IconAnalytics', IconAnalytics],
  ] as const)('%s is a 16×16 stroke icon with no color of its own', (_name, Icon) => {
    const { container } = render(<Icon />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('16')
    expect(svg?.getAttribute('height')).toBe('16')
    expect(svg?.getAttribute('stroke')).toBe('currentColor')
    expect(svg?.getAttribute('fill')).toBe('none')
  })

  it('does not redraw IconRuns', () => {
    const { container } = render(<IconRuns />)
    expect(container.querySelector('circle')).not.toBeNull()
  })
})
