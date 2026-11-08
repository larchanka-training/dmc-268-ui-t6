// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { MetricTooltip } from './MetricTooltip'

describe('MetricTooltip', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders children and displays tooltip on hover and focus', async () => {
    render(
      <MetricTooltip title="Описание метрики">
        <button type="button">Метрика</button>
      </MetricTooltip>,
    )

    const button = screen.getByRole('button', { name: 'Метрика' })
    expect(button).not.toBeNull()
    expect(screen.queryByText('Описание метрики')).toBeNull()

    // Hover
    fireEvent.mouseEnter(button)
    expect(await screen.findByText('Описание метрики')).toBeTruthy()

    fireEvent.mouseLeave(button)
    await waitFor(() => {
      expect(screen.queryByText('Описание метрики')).toBeNull()
    })

    // Focus
    fireEvent.focus(button)
    expect(await screen.findByText('Описание метрики')).toBeTruthy()

    fireEvent.blur(button)
    await waitFor(() => {
      expect(screen.queryByText('Описание метрики')).toBeNull()
    })
  })

  it('closes tooltip when Escape key is pressed', async () => {
    render(
      <MetricTooltip title="Подсказка для закрытия">
        <button type="button">Триггер</button>
      </MetricTooltip>,
    )

    const button = screen.getByRole('button', { name: 'Триггер' })
    fireEvent.focus(button)
    expect(await screen.findByText('Подсказка для закрытия')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByText('Подсказка для закрытия')).toBeNull()
    })
  })
})
