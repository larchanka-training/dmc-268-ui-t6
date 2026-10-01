// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders header, navigation items and main content', () => {
    render(
      <AppLayout currentPath="/repositories">
        <div data-testid="test-content">Контент страницы</div>
      </AppLayout>,
    )

    expect(screen.getByText('AI Code Reviewer')).toBeDefined()
    expect(screen.getByText('Репозитории')).toBeDefined()
    expect(screen.getByText('Прогоны')).toBeDefined()
    expect(screen.getByText('Ревью')).toBeDefined()
    expect(screen.getByTestId('test-content')).toBeDefined()
  })
})
