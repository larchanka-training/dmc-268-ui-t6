// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RowButton } from './RowButton'
import styles from './RowButton.module.css'

afterEach(() => {
  cleanup()
})

describe('RowButton', () => {
  it('is a full-width text button of Ant Design', () => {
    render(<RowButton>Строка</RowButton>)
    const button = screen.getByRole('button', { name: 'Строка' })
    expect(button.classList.contains('ant-btn-block')).toBe(true)
    expect(button.classList.contains('ant-btn-variant-text')).toBe(true)
  })

  it('passes the click, the label and the ref to the button', () => {
    const onClick = vi.fn()
    let node: HTMLElement | null = null
    render(
      <RowButton
        aria-label="Меню пользователя"
        onClick={onClick}
        ref={(element) => {
          node = element
        }}
      >
        createunix
      </RowButton>,
    )
    const button = screen.getByRole('button', { name: 'Меню пользователя' })
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(node).toBe(button)
  })

  it('keeps a class given by the caller next to its own', () => {
    render(<RowButton className="mine">Строка</RowButton>)
    const button = screen.getByRole('button')
    expect(button.classList.contains('mine')).toBe(true)
    expect(styles.row).toBeTruthy()
    expect(button.classList.contains(styles.row ?? '')).toBe(true)
  })
})
