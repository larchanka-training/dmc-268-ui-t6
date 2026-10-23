import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '../App'
import { getAppUrl, loadAppUrl, resetAppUrl } from '../lib/appUrl'
import { AppCta } from './AppCta'
import { Header } from './Header'
import { Hero } from './Hero'

// Literals from the spec, deliberately not imported from the code under test.
const STAGING = 'https://staging-ui.dmc268-t6.axyi.ru'
const LOADED = 'https://example.com/app'

const loadConfig = (appUrl: string) =>
  loadAppUrl(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ appUrl }))))

beforeEach(() => {
  resetAppUrl()
})

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

  it('links the Try it now button to the default app url without config', () => {
    render(<AppCta />)

    const link = screen.getByRole('link', { name: 'Try it now' })
    expect(link.getAttribute('href')).toBe(STAGING)
    expect(getAppUrl()).toBe(STAGING)
  })
})

describe('Try it now links use the loaded config url', () => {
  it.each([
    ['Header', <Header key="h" />],
    ['Hero', <Hero key="r" />],
    ['AppCta', <AppCta key="c" />],
  ])('%s links to the loaded url, not the default', async (_name, element) => {
    await loadConfig(LOADED)
    render(element)

    const link = screen.getByRole('link', { name: 'Try it now' })
    expect(link.getAttribute('href')).toBe(LOADED)
    expect(link.getAttribute('href')).not.toBe(STAGING)
  })

  it('App renders three Try it now links with the loaded url and no waitlist links', async () => {
    await loadConfig(LOADED)
    render(<App />)

    const links = screen.getAllByRole('link', { name: 'Try it now' })
    expect(links).toHaveLength(3)
    for (const link of links) expect(link.getAttribute('href')).toBe(LOADED)
    expect(screen.queryByText('Get early access')).toBeNull()
    expect(document.querySelector('a[href="#waitlist"]')).toBeNull()
  })
})
