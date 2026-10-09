// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { EMPTY_FINDING_FILTERS } from './findingFilters'
import { useFindingFiltersParams } from './useFindingFiltersParams'

type Api = ReturnType<typeof useFindingFiltersParams>

function mount(path: string, history?: { entries: string[]; index: number }) {
  const captured: { api: Api | null } = { api: null }
  function Probe() {
    captured.api = useFindingFiltersParams()
    return null
  }
  const router = createMemoryRouter([{ path: '/runs/:runId', element: <Probe /> }], {
    initialEntries: history?.entries ?? [path],
    initialIndex: history?.index,
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

  it('setFilters merges a partial change over the URL: two selects in one tick keep both', async () => {
    const { router, api } = mount('/runs/r1')

    await act(async () => {
      api().setFilters({ severities: ['info'], query: '' })
      api().setFilters({ files: ['a.ts'], query: '' })
      await Promise.resolve()
    })

    expect(router.state.location.search).toBe('?file=a.ts&severity=info')
  })

  it('setFilters with a partial change keeps the filters it does not name', async () => {
    const { router, api } = mount('/runs/r1?file=a.ts&severity=info&q=x&tab=y')

    await act(async () => {
      api().setFilters({ severities: ['critical'] })
      await Promise.resolve()
    })

    expect(router.state.location.search).toBe('?tab=y&file=a.ts&severity=critical&q=x')
  })

  describe('navigationKey', () => {
    it('stays the same for the writes of the hook itself', async () => {
      const { router, api } = mount('/runs/r1')
      const initial = api().navigationKey

      await act(async () => {
        api().setFilters({ severities: ['info'] })
        await Promise.resolve()
      })
      await act(async () => {
        api().setQuery('x')
        await Promise.resolve()
      })
      await act(async () => {
        api().resetFilters()
        await Promise.resolve()
      })

      expect(router.state.location.search).toBe('')
      expect(api().navigationKey).toBe(initial)
    })

    it('stays the same when several writes land one after another', async () => {
      const { router, api } = mount('/runs/r1')
      const initial = api().navigationKey

      await act(async () => {
        api().setFilters({ severities: ['info'] })
        api().setQuery('x')
        api().setQuery('xy')
        await Promise.resolve()
      })

      expect(router.state.location.search).toBe('?severity=info&q=xy')
      expect(api().navigationKey).toBe(initial)
    })

    it('changes on a POP, even onto a search with the same q', async () => {
      const { router, api } = mount('/runs/r1?severity=info&q=old', {
        entries: ['/runs/r1?q=old', '/runs/r1?severity=info&q=old'],
        index: 1,
      })
      const initial = api().navigationKey

      await act(async () => {
        await router.navigate(-1)
      })

      expect(router.state.location.search).toBe('?q=old')
      expect(api().navigationKey).toBe(initial + 1)

      await act(async () => {
        await router.navigate(1)
      })
      expect(api().navigationKey).toBe(initial + 2)
    })

    it('changes on a push or a replace that the hook did not write', async () => {
      const { router, api } = mount('/runs/r1')
      const initial = api().navigationKey

      await act(async () => {
        await router.navigate('/runs/r1?severity=info')
      })
      expect(api().navigationKey).toBe(initial + 1)

      await act(async () => {
        await router.navigate('/runs/r1?severity=warning', { replace: true })
      })
      expect(api().navigationKey).toBe(initial + 2)
    })

    it('changes for an outside navigation that comes after the hook wrote something', async () => {
      const { router, api } = mount('/runs/r1')
      const initial = api().navigationKey

      await act(async () => {
        api().setFilters({ severities: ['info'] })
        await Promise.resolve()
      })
      await act(async () => {
        await router.navigate('/runs/r1?file=b.ts')
      })

      expect(api().navigationKey).toBe(initial + 1)
    })

    it('a POP is an outside navigation even onto a search the hook has just written', async () => {
      const { router, api } = mount('/runs/r1', {
        entries: ['/runs/r1?severity=info', '/runs/r1'],
        index: 1,
      })
      const initial = api().navigationKey

      await act(async () => {
        api().setFilters({ severities: ['info'] })
        await router.navigate(-2)
      })

      expect(router.state.location.search).toBe('?severity=info')
      expect(api().navigationKey).toBe(initial + 1)
    })

    it('the next write after an outside navigation to the same search drops what was still on its way', async () => {
      const { router, api } = mount('/runs/r1')

      await act(async () => {
        api().setFilters({ severities: ['info'] })
        await router.navigate('/runs/r1')
      })
      await act(async () => {
        api().setQuery('z')
        await Promise.resolve()
      })

      expect(router.state.location.search).toBe('?q=z')
    })

    it('the next write after an outside navigation builds on that navigation', async () => {
      const { router, api } = mount('/runs/r1?severity=info')

      await act(async () => {
        api().setFilters({ files: ['a.ts'] })
        await Promise.resolve()
      })
      await act(async () => {
        await router.navigate(-1)
      })
      await act(async () => {
        api().setQuery('z')
        await Promise.resolve()
      })

      expect(router.state.location.search).toBe('?severity=info&q=z')
    })
  })
})
