// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { DEMO_RUN_ID } from '../../shared/config/demoRun'

const flags = vi.hoisted(() => ({ mocksBuild: false }))

vi.mock('../../shared/config/buildFlags', () => ({
  get VITE_MOCKS_BUILD() {
    return flags.mocksBuild
  },
  mocksEnabledAtRuntime: () => flags.mocksBuild,
}))

import { ReviewRedirect } from './ReviewRedirect'

afterEach(() => {
  cleanup()
  flags.mocksBuild = false
})

function renderReview(mocksBuild: boolean) {
  flags.mocksBuild = mocksBuild
  const router = createMemoryRouter(
    [
      { path: '/review', element: <ReviewRedirect /> },
      { path: '/runs', element: <div data-testid="runs-page" /> },
      { path: '/runs/:runId', element: <div data-testid="demo-run" /> },
    ],
    { initialEntries: ['/review'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('ReviewRedirect', () => {
  it('redirects to /runs when mocks are disabled at build time', () => {
    const router = renderReview(false)
    expect(screen.getByTestId('runs-page')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/runs')
  })

  it('redirects to the demo run when buildFlags.VITE_MOCKS_BUILD is true', () => {
    const router = renderReview(true)
    expect(screen.getByTestId('demo-run')).toBeTruthy()
    expect(screen.queryByTestId('runs-page')).toBeNull()
    expect(router.state.location.pathname).toBe(`/runs/${DEMO_RUN_ID}`)
  })
})
