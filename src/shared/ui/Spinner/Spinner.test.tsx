// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Spinner } from './Spinner'

afterEach(() => {
  cleanup()
})

describe('Spinner', () => {
  it('announces itself as a status with a default name', () => {
    render(<Spinner />)
    expect(screen.getByRole('status').textContent).toBe('Загрузка')
  })

  it('announces a custom label as the text of the live region', () => {
    render(<Spinner label="Загружаем прогоны" />)
    expect(screen.getByRole('status').textContent).toBe('Загружаем прогоны')
  })

  it('is hidden from assistive tech when it only decorates a labelled element', () => {
    const { container } = render(<Spinner label={null} />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
})
