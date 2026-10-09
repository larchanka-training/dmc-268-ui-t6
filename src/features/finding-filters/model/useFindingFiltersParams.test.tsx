// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { EMPTY_FINDING_FILTERS } from './findingFilters'
import { useFindingFiltersParams } from './useFindingFiltersParams'

type Api = ReturnType<typeof useFindingFiltersParams>

function mount(path: string) {
  const captured: { api: Api | null } = { api: null }
  function Probe() {
    captured.api = useFindingFiltersParams()
    return null
  }
  const router = createMemoryRouter([{ path: '/runs/:runId', element: <Probe /> }], {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
  function api(): Api {
    if (captured.api === null) {
      throw new Error('the hook has not rendered')
    }
    return captured.api
  }
  return { router, api }
}

afterEach(() => {
  cleanup()
})

describe('useFindingFiltersParams', () => {
  it('reads the filters from the URL', () => {
    const { api } = mount('/runs/r1?file=a.ts&severity=info&q=x')

    expect(api().filters).toEqual({ files: ['a.ts'], severities: ['info'], query: 'x' })
  })

  it('setQuery replaces the entry, writes only q and keeps every other param', async () => {
    const { router, api } = mount('/runs/r1?tab=x&file=a.ts&severity=info')

    await act(async () => {
      api().setQuery('abc')
      await Promise.resolve()
    })

    expect(router.state.location.search).toBe('?tab=x&file=a.ts&severity=info&q=abc')
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('setQuery with an empty text removes q', async () => {
    const { router, api } = mount('/runs/r1?severity=info&q=abc')

    await act(async () => {
      api().setQuery('')
      await Promise.resolve()
    })

    expect(router.state.location.search).toBe('?severity=info')
  })

  it('setQuery keeps a select change that was issued in the same tick and has not landed', async () => {
    const { router, api } = mount('/runs/r1')

    await act(async () => {
      api().setFilters({ ...EMPTY_FINDING_FILTERS, severities: ['info'] })
      api().setQuery('x')
      await Promise.resolve()
    })

    expect(router.state.location.search).toBe('?severity=info&q=x')
  })

  it('writes on top of the URL after an outside navigation has landed', async () => {
    const { router, api } = mount('/runs/r1')

    await act(async () => {
      await router.navigate('/runs/r1?severity=warning&tab=y')
    })
    await act(async () => {
      api().setQuery('z')
      await Promise.resolve()
    })

    expect(router.state.location.search).toBe('?tab=y&severity=warning&q=z')
  })

  it('setFilters pushes by default and replaces on request', async () => {
    const { router, api } = mount('/runs/r1')

    await act(async () => {
      api().setFilters({ ...EMPTY_FINDING_FILTERS, files: ['a.ts'] })
      await Promise.resolve()
    })
    expect(router.state.historyAction).toBe('PUSH')

    await act(async () => {
      api().setFilters({ ...EMPTY_FINDING_FILTERS, files: ['b.ts'] }, { replace: true })
      await Promise.resolve()
    })
    expect(router.state.historyAction).toBe('REPLACE')
    expect(router.state.location.search).toBe('?file=b.ts')
  })

  it('resetFilters clears the filter params, keeps the others, and pushes', async () => {
    const { router, api } = mount('/runs/r1?tab=x&file=a.ts&severity=info&q=y')

    await act(async () => {
      api().resetFilters()
      await Promise.resolve()
    })

    expect(router.state.location.search).toBe('?tab=x')
    expect(router.state.historyAction).toBe('PUSH')
  })
})
