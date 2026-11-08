// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { MouseEvent } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LinkButton } from './LinkButton'

afterEach(() => {
  cleanup()
})

describe('LinkButton', () => {
  it('renders a real link with href matching the route', () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: <LinkButton to="/repositories">К репозиториям</LinkButton>,
      },
    ])
    render(<RouterProvider router={router} />)

    const link = screen.getByRole('link', { name: 'К репозиториям' })
    expect(link.getAttribute('href')).toBe('/repositories')
    expect(link.tagName).toBe('A')
  })

  it('renders href respecting the router basename', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <LinkButton to="/repositories">К репозиториям</LinkButton>,
        },
      ],
      { basename: '/app', initialEntries: ['/app'] },
    )
    render(<RouterProvider router={router} />)

    const link = screen.getByRole('link', { name: 'К репозиториям' })
    expect(link.getAttribute('href')).toBe('/app/repositories')
  })

  it('navigates to the destination route without a full page reload on click', async () => {
    function Destination() {
      const location = useLocation()
      return <div data-testid="destination">На месте: {location.pathname}</div>
    }

    const router = createMemoryRouter([
      {
        path: '/',
        element: <LinkButton to="/repositories">Перейти</LinkButton>,
      },
      {
        path: '/repositories',
        element: <Destination />,
      },
    ])

    render(<RouterProvider router={router} />)

    const link = screen.getByRole('link', { name: 'Перейти' })
    const notPrevented = fireEvent.click(link)
    expect(notPrevented).toBe(false)

    const destination = await screen.findByTestId('destination')
    expect(destination.textContent).toBe('На месте: /repositories')
  })

  it('honors event.preventDefault in custom onClick without navigating', () => {
    function Destination() {
      const location = useLocation()
      return <div data-testid="destination">На месте: {location.pathname}</div>
    }

    const handleClick = vi.fn((e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      e.preventDefault()
    })

    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <LinkButton to="/repositories" onClick={handleClick}>
            Не переходить
          </LinkButton>
        ),
      },
      {
        path: '/repositories',
        element: <Destination />,
      },
    ])

    render(<RouterProvider router={router} />)

    const link = screen.getByRole('link', { name: 'Не переходить' })
    const notPrevented = fireEvent.click(link)
    expect(notPrevented).toBe(false)

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('destination')).toBeNull()
  })

  it('allows native browser handling for target="_blank" without preventing default', () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <LinkButton to="/repositories" target="_blank">
            В новой вкладке
          </LinkButton>
        ),
      },
    ])

    render(<RouterProvider router={router} />)

    const link = screen.getByRole('link', { name: 'В новой вкладке' })
    expect(link.getAttribute('target')).toBe('_blank')
    const notPrevented = fireEvent.click(link)
    expect(notPrevented).toBe(true)
  })
})
