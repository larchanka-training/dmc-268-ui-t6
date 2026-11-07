// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'

function mockScroll(path: string) {
  history.replaceState(null, '', path)
  const scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  return { scrollIntoView, scrollTo }
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
