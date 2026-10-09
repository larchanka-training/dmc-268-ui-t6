import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { joinWaitlist } from '../lib/waitlist'
import { Waitlist } from './Waitlist'

vi.mock('../lib/waitlist', () => ({ joinWaitlist: vi.fn() }))
const join = vi.mocked(joinWaitlist)

function submit(value: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Join waitlist' }))
}

afterEach(() => {
  join.mockReset()
})

describe('Waitlist', () => {
  it('shows an error and does not submit an invalid email', () => {
    render(<Waitlist />)
    submit('not-an-email')

    expect(screen.getByRole('alert').textContent).toMatch(/valid email/)
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true')
    expect(join).not.toHaveBeenCalled()
  })

  it('shows loading, then success, and submits once', async () => {
    let resolve: (value: 'joined') => void = () => undefined
    join.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<Waitlist />)

    submit('dev@example.com')
    const button = screen.getByRole('button', { name: 'Joining…' })
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
    expect(join).toHaveBeenCalledTimes(1)

    resolve('joined')
    expect((await screen.findByRole('status')).textContent).toMatch(/on the list/)
  })

  it('shows a retryable error when the request fails', async () => {
    join.mockRejectedValueOnce(new Error('network'))
    render(<Waitlist />)

    submit('dev@example.com')

    expect((await screen.findByRole('alert')).textContent).toMatch(/try again/)
    expect(screen.getByRole('button', { name: 'Join waitlist' }).hasAttribute('disabled')).toBe(
      false,
    )
  })
})
