// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { InfoHint } from './InfoHint'
import styles from './InfoHint.module.css'

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
      expect(screen.queryByText('The index stores structure only.')).toBeNull()
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
      expect(screen.queryByText('The index stores structure only.')).toBeNull()
    })
  })

  it('reopens on the first click after Escape closes a click-opened hint', async () => {
    const button = renderHint()
    fireEvent.click(button)
    expect(await screen.findByText('The index stores structure only.')).toBeTruthy()

    fireEvent.keyDown(button, { key: 'Escape' })
    await waitFor(() => {
      expect(button.getAttribute('aria-expanded')).toBe('false')
      expect(screen.queryByText('The index stores structure only.')).toBeNull()
    })

    fireEvent.click(button)
    expect(await screen.findByText('The index stores structure only.')).toBeTruthy()
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  it('closes on the first pointer click after opening with the keyboard', async () => {
    const button = renderHint()
    button.focus()
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(await screen.findByText('The index stores structure only.')).toBeTruthy()

    fireEvent.click(button)
    await waitFor(() => {
      expect(button.getAttribute('aria-expanded')).toBe('false')
      expect(screen.queryByText('The index stores structure only.')).toBeNull()
    })
  })

  it('applies the width class to the popover root', async () => {
    const button = renderHint()
    fireEvent.click(button)
    const content = await screen.findByText('The index stores structure only.')
    expect(content.closest('.ant-popover')?.className).toContain(styles.popup)
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
      expect(screen.queryByText('The index stores structure only.')).toBeNull()
    })
    expect(document.activeElement).toBe(button)

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })
})
