// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useLayoutEffect } from 'react'
import { createMemoryRouter, MemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useFindingFiltersParams } from './useFindingFiltersParams'
import { useRouterLocationAdapter, type RouterLocation } from './routerLocationAdapter'

afterEach(() => {
  cleanup()
})

describe('router location compatibility', () => {
  it('upgrade canary: the installed data router exposes synchronous locations and unsubscribes', async () => {
    const received = vi.fn<(snapshot: RouterLocation) => void>()
    function Probe() {
      const adapter = useRouterLocationAdapter()
      useLayoutEffect(() => adapter?.subscribe(received), [adapter])
      return <output>{adapter ? 'pre-commit available' : 'fallback'}</output>
    }
    const router = createMemoryRouter([{ path: '/runs/:runId', element: <Probe /> }], {
      initialEntries: ['/runs/r1'],
    })
    const view = render(<RouterProvider router={router} />)
    expect(screen.getByText('pre-commit available')).toBeTruthy()
    await act(async () => {
      const pending = router.navigate('/runs/r2?tab=notes')
      expect(received.mock.calls[0]?.[0].location.pathname).toBe('/runs/r2')
      expect(received.mock.calls[0]?.[0].location.search).toBe('?tab=notes')
      expect(received.mock.calls[0]?.[0].action).toBe('PUSH')
      await pending
    })
    view.unmount()
    received.mockClear()
    await router.navigate('/runs/r3')
    expect(received).not.toHaveBeenCalled()
    router.dispose()
  })

  it('uses rendered public hooks without a data router', async () => {
    function Probe() {
      const adapter = useRouterLocationAdapter()
      const { filters, setQuery } = useFindingFiltersParams()
      return (
        <button
          onClick={() => {
            setQuery('fallback')
          }}
        >
          {adapter ? 'adapter' : filters.query || 'empty'}
        </button>
      )
    }
    render(
      <MemoryRouter initialEntries={['/runs/r1?tab=notes']}>
        <Probe />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'empty' }))
    expect(await screen.findByRole('button', { name: 'fallback' })).toBeTruthy()
  })
})
