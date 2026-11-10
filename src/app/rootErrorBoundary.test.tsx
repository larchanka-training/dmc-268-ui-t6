// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '../App'
import { i18n } from '../shared/i18n'
import type * as i18nModule from '../shared/i18n'
import type * as providers from './providers'
import type * as routes from './routes'

// What breaks in a test: no real input makes a provider or the router factory throw.
const failure = vi.hoisted(() => ({ provider: false, router: false, translation: false }))

vi.mock('./providers', async (importOriginal) => {
  const actual = await importOriginal<typeof providers>()
  return {
    ...actual,
    UiProvider: (props: Parameters<typeof actual.UiProvider>[0]) => {
      if (failure.provider) throw new Error('provider failed')
      return <actual.UiProvider {...props} />
    },
  }
})

vi.mock('./routes', async (importOriginal) => {
  const actual = await importOriginal<typeof routes>()
  return {
    ...actual,
    createAppRouter: () => {
      if (failure.router) throw new Error('router failed')
      return actual.createAppRouter()
    },
  }
})

vi.mock('../shared/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof i18nModule>()
  return {
    ...actual,
    useTranslation: (...args: Parameters<typeof actual.useTranslation>) => {
      if (failure.translation) throw new Error('translation failed')
      return actual.useTranslation(...args)
    },
  }
})

beforeEach(() => {
  // React reports the error the boundary caught to the console.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  failure.provider = false
  failure.router = false
  failure.translation = false
})

function stubReload() {
  const location = { href: 'http://localhost/repositories', reload: vi.fn() }
  vi.stubGlobal('location', location)
  return location
}

describe('root error boundary', () => {
  it('shows the 500 screen with a reload button when a provider throws', () => {
    failure.provider = true
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Произошла непредвиденная ошибка' })).toBeTruthy()
    expect(
      screen.getByText(
        'Приложение остановилось из-за ошибки. Перезагрузите страницу, чтобы продолжить.',
      ),
    ).toBeTruthy()
    const location = stubReload()
    fireEvent.click(screen.getByRole('button', { name: 'Перезагрузить' }))
    expect(location.reload).toHaveBeenCalledTimes(1)
    // The error message is developer text: the screen does not show it.
    expect(document.body.textContent).not.toContain('provider failed')
  })

  it('shows the 500 screen when the app throws above the providers', () => {
    failure.router = true
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Произошла непредвиденная ошибка' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Перезагрузить' })).toBeTruthy()
    expect(document.body.textContent).not.toContain('router failed')
  })

  it('does not need the translation hook, which may be what failed', () => {
    failure.provider = true
    failure.translation = true
    render(<App />)

    expect(screen.getByRole('button', { name: 'Перезагрузить' })).toBeTruthy()
    expect(document.body.textContent).not.toContain('failed')
  })

  it('speaks English for an English user', async () => {
    await i18n.changeLanguage('en')
    failure.provider = true
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeTruthy()
    expect(
      screen.getByText('The app stopped because of an error. Reload the page to continue.'),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
  })
})
