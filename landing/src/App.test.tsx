// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'

function mockScroll(path: string) {
  history.replaceState(null, '', path)
  const scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  return { scrollIntoView, scrollTo }
}

function mockFontReady() {
  let resolve!: () => void
  const ready = new Promise<void>((done) => {
    resolve = done
  })
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } })
  return { ready, resolve }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  history.replaceState(null, '', '/')
})

describe('initial landing fragment', () => {
  it.each(['how-it-works', 'features'])(
    'scrolls the rendered #%s section below the header',
    (id) => {
      const { scrollIntoView, scrollTo } = mockScroll(`/#${id}`)

      render(<App />)

      const section = document.getElementById(id)
      expect(section).not.toBeNull()
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' })
      expect(scrollIntoView.mock.contexts[0]).toBe(section)
      expect(scrollTo).not.toHaveBeenCalled()
    },
  )

  it.each(['how-it-works', 'features'])(
    'realigns #%s after the web fonts finish loading',
    async (id) => {
      const fonts = mockFontReady()
      const { scrollIntoView } = mockScroll(`/#${id}`)

      render(<App />)
      expect(scrollIntoView).toHaveBeenCalledTimes(1)

      await act(() => {
        fonts.resolve()
        return fonts.ready
      })

      expect(scrollIntoView).toHaveBeenCalledTimes(2)
      expect(scrollIntoView.mock.contexts[1]).toBe(document.getElementById(id))
    },
  )

  it.each(['wheel', 'touchstart', 'keydown', 'pointerdown'])(
    'does not pull the page back after %s before fonts finish loading',
    async (eventType) => {
      const fonts = mockFontReady()
      const { scrollIntoView } = mockScroll('/#features')

      render(<App />)
      window.dispatchEvent(new Event(eventType))
      await act(() => {
        fonts.resolve()
        return fonts.ready
      })

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
    },
  )

  it('does not realign after unmounting while fonts are pending', async () => {
    const fonts = mockFontReady()
    const { scrollIntoView } = mockScroll('/#features')

    const view = render(<App />)
    view.unmount()
    await act(() => {
      fonts.resolve()
      return fonts.ready
    })

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('resets an unknown fragment to the Hero', () => {
    const { scrollIntoView, scrollTo } = mockScroll('/#несуществующий')

    render(<App />)

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('leaves a visit without a fragment to the bootstrap top reset', () => {
    const { scrollIntoView, scrollTo } = mockScroll('/')

    render(<App />)

    expect(scrollTo).not.toHaveBeenCalled()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
