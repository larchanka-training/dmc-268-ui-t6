// @vitest-environment jsdom
import { act, cleanup } from '@testing-library/react'
import type { Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

let mountedRoot: Root | undefined

afterEach(async () => {
  await act(() => {
    mountedRoot?.unmount()
    return Promise.resolve()
  })
  mountedRoot = undefined
  document.getElementById('root')?.remove()
  cleanup()
  vi.doUnmock('react-dom/client')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  history.replaceState(null, '', '/')
})

it('waits for config before rendering a fragment and never resets its scroll afterward', async () => {
  history.replaceState(null, '', '/#features')
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
  vi.doMock('react-dom/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-dom/client')>()
    return {
      ...actual,
      createRoot: (...args: Parameters<typeof actual.createRoot>) => {
        mountedRoot = actual.createRoot(...args)
        return mountedRoot
      },
    }
  })

  let resolveFetch!: (response: Response) => void
  const fetch = vi.fn<typeof globalThis.fetch>(
    () =>
      new Promise<Response>((resolve) => {
        resolveFetch = resolve
      }),
  )
  vi.stubGlobal('fetch', fetch)
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  const scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView

  await import('./main')
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  })

  expect(fetch).toHaveBeenCalledWith('/config.json', expect.any(Object))
  expect(root.querySelector('#features')).toBeNull()
  expect(scrollIntoView).not.toHaveBeenCalled()
  expect(scrollTo).not.toHaveBeenCalled()

  await act(() => {
    resolveFetch(new Response('{"appUrl":"https://app.example.com"}'))
    return Promise.resolve()
  })

  expect(root.querySelector('#features')).not.toBeNull()
  expect(root.querySelector('a[href="https://app.example.com/"]')).not.toBeNull()
  expect(scrollIntoView).toHaveBeenCalled()
  expect(scrollIntoView.mock.contexts[0]).toBe(root.querySelector('#features'))
  expect(scrollTo).not.toHaveBeenCalled()
})
