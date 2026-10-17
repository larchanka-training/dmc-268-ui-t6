// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { useRunListFilterParams } from './useRunListFilterParams'

function setup(initialEntry: string) {
  let latest: ReturnType<typeof useRunListFilterParams> | undefined
  function Harness() {
    latest = useRunListFilterParams()
    return null
  }
  const router = createMemoryRouter([{ path: '/runs', element: <Harness /> }], {
    initialEntries: [initialEntry],
  })
  render(<RouterProvider router={router} />)
  return {
    router,
    hook: () => {
      if (latest === undefined) {
        throw new Error('the hook has not rendered')
      }
      return latest
    },
  }
}

afterEach(() => {
  cleanup()
})

describe('useRunListFilterParams', () => {
  it('reads the repo filter from the URL', () => {
    const { hook } = setup('/runs?repo=org%2Frepo')
    expect(hook().filter).toEqual({ repo: 'org/repo' })
  })

  it('resets the filter with a navigation push that keeps unrelated params', async () => {
    const { router, hook } = setup('/runs?repo=org%2Frepo&page=2')

    await act(async () => {
      hook().resetFilter()
      await Promise.resolve()
    })

    expect(router.state.location.search).toBe('?page=2')
    expect(hook().filter).toEqual({})

    await act(async () => {
      await router.navigate(-1)
    })
    expect(router.state.location.search).toBe('?repo=org%2Frepo&page=2')
  })
})
