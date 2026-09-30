// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useThemeStore } from '../model/store'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'light' })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders and toggles theme on click', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /переключить тему/i })
    expect(button).toBeDefined()
    expect(useThemeStore.getState().mode).toBe('light')

    fireEvent.click(button)
    expect(useThemeStore.getState().mode).toBe('dark')

    fireEvent.click(button)
    expect(useThemeStore.getState().mode).toBe('light')
  })
})
