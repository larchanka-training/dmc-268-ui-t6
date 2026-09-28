// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MOCK_USER, useAuthStore } from '../model/store'
import { UserMenu } from './UserMenu'

describe('UserMenu', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders nothing when not authenticated', () => {
    const { container } = render(<UserMenu />)
    expect(container.firstChild).toBeNull()
  })

  it('renders user details when authenticated', () => {
    useAuthStore.setState({
      user: MOCK_USER,
      isAuthenticated: true,
    })

    render(<UserMenu />)
    expect(screen.getAllByText('skvertl').length).toBeGreaterThan(0)
  })
})
