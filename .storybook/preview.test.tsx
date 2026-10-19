// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import type { DocsContainerProps } from '@storybook/addon-docs/blocks'
import type { ComponentType, PropsWithChildren } from 'react'
import { Channel } from 'storybook/internal/channels'
import { GLOBALS_UPDATED } from 'storybook/internal/core-events'
import { addons } from 'storybook/preview-api'
import { afterEach, describe, expect, it, vi } from 'vitest'

import preview from './preview'

vi.mock('@storybook/addon-docs/blocks', () => ({
  DocsContainer: ({ children, theme }: PropsWithChildren<{ theme: { base: string } }>) => (
    <div data-testid="docs" data-theme={theme.base}>
      {children}
    </div>
  ),
}))

vi.mock('../src/shared/ui', () => ({ DesignSystemProvider: vi.fn() }))

const { docs } = preview.parameters as {
  docs: { container: ComponentType<PropsWithChildren<DocsContainerProps>> }
}
const Docs = docs.container
const context = {} as DocsContainerProps['context']

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
  delete document.documentElement.dataset.rvTheme
})

describe('Storybook documentation theme', () => {
  it.each(['light', 'dark'])('uses the %s URL theme before globals are available', (mode) => {
    const channel = new Channel({ async: false })
    addons.setChannel(channel)
    window.history.replaceState({}, '', `/iframe.html?globals=theme:${mode}`)

    render(<Docs context={context}>Specification</Docs>)
    expect(document.documentElement.dataset.rvTheme).toBe(mode)
    expect(screen.getByTestId('docs').dataset.theme).toBe(mode)
  })

  it('uses the latest globals after navigating away and back despite a stale light URL', () => {
    const channel = new Channel({ async: false })
    addons.setChannel(channel)
    window.history.replaceState({}, '', '/iframe.html?globals=theme:light')
    channel.emit(GLOBALS_UPDATED, { globals: { theme: 'dark' } })

    const first = render(<Docs context={context}>Specification</Docs>)
    expect(document.documentElement.dataset.rvTheme).toBe('dark')
    expect(screen.getByTestId('docs').dataset.theme).toBe('dark')

    act(() => {
      channel.emit(GLOBALS_UPDATED, { globals: { theme: 'light' } })
    })
    expect(document.documentElement.dataset.rvTheme).toBe('light')
    expect(screen.getByTestId('docs').dataset.theme).toBe('light')

    act(() => {
      channel.emit(GLOBALS_UPDATED, { globals: { theme: 'dark' } })
    })
    expect(document.documentElement.dataset.rvTheme).toBe('dark')
    expect(screen.getByTestId('docs').dataset.theme).toBe('dark')
    first.unmount()
    expect(channel.listenerCount(GLOBALS_UPDATED)).toBe(0)

    render(<Docs context={context}>Specification</Docs>)
    expect(document.documentElement.dataset.rvTheme).toBe('dark')
    expect(screen.getByTestId('docs').dataset.theme).toBe('dark')
    expect(channel.listenerCount(GLOBALS_UPDATED)).toBe(1)
    cleanup()
    expect(channel.listenerCount(GLOBALS_UPDATED)).toBe(0)
  })

  it.each([undefined, { globals: {} }, { globals: { theme: 'sepia' } }])(
    'keeps the current valid theme when the globals event is invalid: %j',
    (event) => {
      const channel = new Channel({ async: false })
      addons.setChannel(channel)
      channel.emit(GLOBALS_UPDATED, { globals: { theme: 'light' } })
      render(<Docs context={context}>Specification</Docs>)

      act(() => {
        channel.emit(GLOBALS_UPDATED, event)
      })
      expect(document.documentElement.dataset.rvTheme).toBe('light')
      expect(screen.getByTestId('docs').dataset.theme).toBe('light')
    },
  )
})
