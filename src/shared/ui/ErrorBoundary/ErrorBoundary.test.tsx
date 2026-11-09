// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '../../i18n'
import { ErrorBoundary } from './ErrorBoundary'

const BLOCK_FAILED_RU = 'Не удалось загрузить этот блок, обновите страницу'
const BLOCK_FAILED_EN = "Couldn't load this block. Refresh the page."

function Broken(): never {
  throw new Error('chart failed')
}

beforeEach(() => {
  // React reports an error a boundary caught to the console.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>Chart</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('Chart')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the block stub in place of a child that throws and keeps the rest of the page', () => {
    render(
      <>
        <ErrorBoundary>
          <Broken />
        </ErrorBoundary>
        <p>Neighbour</p>
      </>,
    )

    expect(screen.getByRole('alert').textContent).toBe(BLOCK_FAILED_RU)
    expect(screen.getByText('Neighbour')).toBeTruthy()
  })

  it('shows the block stub in English', async () => {
    await i18n.changeLanguage('en')
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert').textContent).toBe(BLOCK_FAILED_EN)
  })

  it('shows the given fallback instead of the block stub', () => {
    render(
      <ErrorBoundary fallback={<p>Own fallback</p>}>
        <Broken />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Own fallback')).toBeTruthy()
    expect(screen.queryByText(BLOCK_FAILED_RU)).toBeNull()
  })
})
