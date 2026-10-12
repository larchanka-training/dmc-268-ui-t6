// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { ConfigProvider, Spin, theme as antdTheme } from 'antd'
import { useContext, type JSX } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DesignSystemProvider } from './DesignSystemProvider'

const originalMatchMedia = window.matchMedia.bind(window)

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.rvTheme
  window.matchMedia = originalMatchMedia
})

/** A controllable `prefers-reduced-motion`: returns a function that flips the setting. */
function mockReducedMotion(initial: boolean): (matches: boolean) => void {
  let matches = initial
  const listeners = new Set<() => void>()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return query.includes('prefers-reduced-motion') && matches
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: () => void) => {
      listeners.delete(listener)
    },
  }))
  return (next) => {
    matches = next
    for (const listener of listeners) {
      listener()
    }
  }
}

function MotionProbe(): JSX.Element {
  const { token } = antdTheme.useToken()
  return <output data-testid="motion">{String(token.motion)}</output>
}

describe('DesignSystemProvider', () => {
  it('sets the theme attribute that the CSS tokens read', () => {
    const { rerender } = render(
      <DesignSystemProvider mode="dark">
        <span />
      </DesignSystemProvider>,
    )
    expect(document.documentElement.dataset.rvTheme).toBe('dark')
    rerender(
      <DesignSystemProvider mode="light">
        <span />
      </DesignSystemProvider>,
    )
    expect(document.documentElement.dataset.rvTheme).toBe('light')
  })

  it('replaces the default Ant Design spin indicator with the ring', () => {
    const { container } = render(
      <DesignSystemProvider mode="dark">
        <Spin />
      </DesignSystemProvider>,
    )
    expect(container.querySelector('[data-size="inherit"]')).not.toBeNull()
    expect(container.querySelector('.ant-spin-dot-item')).toBeNull()
  })

  it('turns the click ripple of Ant Design off', () => {
    function WaveProbe(): JSX.Element {
      const { wave } = useContext(ConfigProvider.ConfigContext)
      return <output data-testid="wave">{String(wave?.disabled)}</output>
    }
    const { getByTestId } = render(
      <DesignSystemProvider mode="dark">
        <WaveProbe />
      </DesignSystemProvider>,
    )
    expect(getByTestId('wave').textContent).toBe('true')
  })

  it('keeps Ant Design animations while the system does not ask to reduce motion', () => {
    mockReducedMotion(false)
    const { getByTestId } = render(
      <DesignSystemProvider mode="dark">
        <MotionProbe />
      </DesignSystemProvider>,
    )
    expect(getByTestId('motion').textContent).toBe('true')
  })

  it('stops Ant Design animations under reduced motion and follows a change of the setting', () => {
    const setReducedMotion = mockReducedMotion(true)
    const { getByTestId } = render(
      <DesignSystemProvider mode="dark">
        <MotionProbe />
      </DesignSystemProvider>,
    )
    expect(getByTestId('motion').textContent).toBe('false')
    act(() => {
      setReducedMotion(false)
    })
    expect(getByTestId('motion').textContent).toBe('true')
  })
})
