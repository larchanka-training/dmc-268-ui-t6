// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { createMemoryRouter, useLocation } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useFindingFiltersParams } from './useFindingFiltersParams'
import { useQueryText } from './useQueryText'

const routers: ReturnType<typeof createMemoryRouter>[] = []

function mount(entries: string[]) {
  let blocked = false
  let release: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  function Page() {
    const location = useLocation()
    const { filters, setQuery, navigationKey, subscribeToNavigation } = useFindingFiltersParams()
    const query = useQueryText(filters.query, setQuery, navigationKey, subscribeToNavigation)
    if (blocked && location.key !== initialKey) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Suspense requires a pending promise.
      throw promise
    }
    return (
      <label>
        Search {location.pathname}
        <output data-testid="committed-search">{location.search}</output>
        <input
          aria-label="Search"
          value={query.text}
          onChange={(e) => {
            query.type(e.target.value)
          }}
        />
      </label>
    )
  }
  const router = createMemoryRouter([{ path: '/runs/:runId', element: <Page /> }], {
    initialEntries: entries,
    initialIndex: entries.length - 1,
  })
  routers.push(router)
  const initialKey = router.state.location.key
  render(
    <Suspense fallback="Loading">
      <RouterProvider router={router} />
    </Suspense>,
  )
  return {
    router,
    block() {
      blocked = true
    },
    async release() {
      blocked = false
      await act(async () => {
        release()
        await promise
      })
    },
  }
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await Promise.resolve()
  })
}

afterEach(() => {
  cleanup()
  for (const router of routers.splice(0)) {
    router.dispose()
  }
  vi.useRealTimers()
})

describe('query navigation before a slow React commit', () => {
  it('does not carry pending search to another run while its commit is suspended', async () => {
    vi.useFakeTimers()
    const view = mount(['/runs/r1'])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'pending' } })
    await advance(249)
    view.block()
    await act(async () => {
      await view.router.navigate('/runs/r2')
    })
    expect(view.router.state.location.pathname).toBe('/runs/r2')
    expect(screen.getByText('Search /runs/r1')).toBeTruthy()
    await advance(250)
    expect(view.router.state.location.search).toBe('')
    await view.release()
    expect(view.router.state.location.pathname).toBe('/runs/r2')
    expect(view.router.state.location.search).toBe('')
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('')
  })

  it('typing after POP uses the destination without restoring removed filters', async () => {
    vi.useFakeTimers()
    const view = mount(['/runs/r1?tab=notes', '/runs/r1?file=a.ts&severity=critical'])
    view.block()
    await act(async () => {
      await view.router.navigate(-1)
    })
    expect(view.router.state.location.search).toBe('?tab=notes')
    expect(screen.getByText('Search /runs/r1')).toBeTruthy()
    expect(screen.getByTestId('committed-search').textContent).toBe('?file=a.ts&severity=critical')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'fresh' } })
    await advance(249)
    expect(view.router.state.location.search).toBe('?tab=notes')
    await advance(1)
    expect(view.router.state.location.search).toBe('?tab=notes&q=fresh')
    await view.release()
    expect(view.router.state.location.search).toBe('?tab=notes&q=fresh')
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('fresh')
  })
  it.each([
    ['POP', undefined],
    ['PUSH', false],
    ['REPLACE', true],
  ] as const)('drops old pending text on an external %s before commit', async (action, replace) => {
    vi.useFakeTimers()
    const view = mount(['/runs/r1?tab=notes&q=target', '/runs/r1?severity=critical&q=old'])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'stale pending' } })
    view.block()
    await act(async () => {
      if (action === 'POP') {
        await view.router.navigate(-1)
      } else {
        await view.router.navigate('/runs/r1?tab=notes&q=target', { replace })
      }
    })
    expect(view.router.state.location.search).toBe('?tab=notes&q=target')
    expect(screen.getByText('Search /runs/r1')).toBeTruthy()
    expect(screen.getByTestId('committed-search').textContent).toBe('?severity=critical&q=old')
    await advance(250)
    expect(view.router.state.location.search).toBe('?tab=notes&q=target')
    await view.release()
    expect(view.router.state.location.search).toBe('?tab=notes&q=target')
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('target')
  })

  it('the still-visible input of another run cannot write even when both searches match', async () => {
    vi.useFakeTimers()
    const view = mount(['/runs/r1?tab=notes'])
    view.block()
    await act(async () => {
      await view.router.navigate('/runs/r2?tab=notes')
    })
    expect(view.router.state.location.pathname).toBe('/runs/r2')
    expect(screen.getByText('Search /runs/r1')).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'wrong run' } })
    await advance(250)
    expect(view.router.state.location.pathname).toBe('/runs/r2')
    expect(view.router.state.location.search).toBe('?tab=notes')
    await view.release()
    expect(view.router.state.location.search).toBe('?tab=notes')
  })
  it('keeps text entered after POP when the commit finishes before its debounce', async () => {
    vi.useFakeTimers()
    const view = mount(['/runs/r1?tab=notes', '/runs/r1?severity=critical'])
    view.block()
    await act(async () => {
      await view.router.navigate(-1)
    })
    expect(screen.getByTestId('committed-search').textContent).toBe('?severity=critical')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'fresh' } })
    await advance(249)
    await view.release()
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('fresh')
    await advance(1)
    expect(view.router.state.location.search).toBe('?tab=notes&q=fresh')
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('fresh')
  })
})
