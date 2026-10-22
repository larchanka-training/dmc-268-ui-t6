import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DEFAULT_APP_URL, getAppUrl } from '../lib/appUrl'
import { AppCta } from './AppCta'

describe('AppCta', () => {
  it('shows the new lead and no waitlist form', () => {
    render(<AppCta />)

    expect(screen.getByRole('heading', { name: 'Be first to review smarter.' })).toBeTruthy()
    expect(
      screen.getByText('Connect your GitHub repo and get your first AI review in minutes.'),
    ).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByText(/No spam/)).toBeNull()
  })

  it('links the Try it now button to the app url (default without config)', () => {
    render(<AppCta />)

    const link = screen.getByRole('link', { name: 'Try it now' })
    expect(link.getAttribute('href')).toBe(getAppUrl())
    expect(link.getAttribute('href')).toBe(DEFAULT_APP_URL)
  })
})
