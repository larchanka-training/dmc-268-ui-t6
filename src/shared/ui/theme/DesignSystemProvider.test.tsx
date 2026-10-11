// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { Spin } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

import { DesignSystemProvider } from './DesignSystemProvider'

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.rvTheme
})

describe('DesignSystemProvider', () => {
  it('sets the theme attribute that the CSS tokens read', () => {
    const { rerender } = render(
      <DesignSystemProvider mode="dark">
        <span />
      </DesignSystemProvider>,
    )
    expect(document.documentElement.dataset.rvTheme).toBe('dark')
    rerender(
      <DesignSystemProvider mode="light">
        <span />
      </DesignSystemProvider>,
    )
    expect(document.documentElement.dataset.rvTheme).toBe('light')
  })

  it('replaces the default Ant Design spin indicator with the ring', () => {
    const { container } = render(
      <DesignSystemProvider mode="dark">
        <Spin />
      </DesignSystemProvider>,
    )
    expect(container.querySelector('[data-size="inherit"]')).not.toBeNull()
    expect(container.querySelector('.ant-spin-dot-item')).toBeNull()
  })
})
