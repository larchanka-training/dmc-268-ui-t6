// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'

vi.mock('../../shared/config/buildFlags', () => ({
  VITE_MOCKS_BUILD: false,
  mocksEnabledAtRuntime: () => false,
}))

import { ReviewRedirect } from './ReviewRedirect'

afterEach(() => {
  cleanup()
})

describe('ReviewRedirect', () => {
  it('redirects to /runs when mocks are disabled at build time', () => {
    const router = createMemoryRouter(
      [
        { path: '/review', element: <ReviewRedirect /> },
        { path: '/runs', element: <div data-testid="runs-page" /> },
      ],
      { initialEntries: ['/review'] },
    )
    render(<RouterProvider router={router} />)
    expect(screen.getByTestId('runs-page')).toBeTruthy()
  })
})
