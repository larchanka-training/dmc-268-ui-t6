// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { Form, Input } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Form.Item lifecycle', () => {
  it('cancels pending updates when the form unmounts', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const { unmount } = render(
      <Form layout="inline">
        <Form.Item htmlFor="search" label="Поиск">
          <Input id="search" />
        </Form.Item>
      </Form>,
    )

    expect(screen.getByRole('textbox', { name: 'Поиск' })).toBeTruthy()
    // Empty error and warning lists schedule delayed updates even without validation rules.
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
