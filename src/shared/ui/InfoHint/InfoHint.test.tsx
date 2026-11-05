// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { InfoHint } from './InfoHint'

afterEach(() => {
  cleanup()
})

function renderHint() {
  render(<InfoHint label="More about RAG">The index stores structure only.</InfoHint>)
  return screen.getByRole('button', { name: 'More about RAG' })
}

describe('InfoHint', () => {
  it('opens on hover and closes when the pointer leaves', async () => {
    const button = renderHint()

    fireEvent.mouseEnter(button)
    expect(await screen.findByText('The index stores structure only.')).toBeTruthy()
    expect(button.getAttribute('aria-expanded')).toBe('true')

    fireEvent.mouseLeave(button)
    await waitFor(() => {
      expect(button.getAttribute('aria-expanded')).toBe('false')
    })
  })

  it('closes a hover-opened hint with Escape even when its button has no focus', async () => {
    const button = renderHint()
    fireEvent.mouseEnter(button)
    expect(await screen.findByText('The index stores structure only.')).toBeTruthy()
    expect(document.activeElement).not.toBe(button)

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(button.getAttribute('aria-expanded')).toBe('false')
      expect(screen.queryByText('The index stores structure only.')).toBeNull()
    })
  })

  it('keeps the hint open when the first pointer click follows hover', async () => {
    const button = renderHint()
    fireEvent.mouseEnter(button)
    expect(await screen.findByText('The index stores structure only.')).toBeTruthy()

    fireEvent.pointerDown(button)
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('The index stores structure only.')).toBeTruthy()
  })

  it('opens and closes on click', async () => {
    const button = renderHint()

    fireEvent.click(button)
    expect(await screen.findByText('The index stores structure only.')).toBeTruthy()
    expect(button.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(button)
    await waitFor(() => {
      expect(button.getAttribute('aria-expanded')).toBe('false')
    })
  })

  it.each(['Enter', ' '])('opens with %s and closes with Escape', async (key) => {
    const button = renderHint()
    button.focus()

    fireEvent.keyDown(button, { key })
    expect(await screen.findByText('The index stores structure only.')).toBeTruthy()
    expect(button.getAttribute('aria-expanded')).toBe('true')

    fireEvent.keyDown(button, { key: 'Escape' })
    await waitFor(() => {
      expect(button.getAttribute('aria-expanded')).toBe('false')
    })
    expect(document.activeElement).toBe(button)

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })
})
