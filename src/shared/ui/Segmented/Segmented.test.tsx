// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { Segmented, type SegmentedProps } from './Segmented'

afterEach(() => {
  cleanup()
})

describe('Segmented', () => {
  it('names the radio group and leaves its root out of the Tab order', () => {
    render(
      <Segmented
        aria-label="Фильтр репозиториев"
        defaultValue="all"
        options={[
          { label: 'Все', value: 'all' },
          { label: 'Активные', value: 'active' },
        ]}
      />,
    )
    const group = screen.getByRole('radiogroup', { name: 'Фильтр репозиториев' })
    expect(group.tabIndex).toBe(-1)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Все' }).checked).toBe(true)
  })

  it('requires an accessible name at its public type boundary', () => {
    expectTypeOf<SegmentedProps>().toExtend<{ 'aria-label': string }>()
  })

  it('skips disabled options on arrow keys in uncontrolled mode', () => {
    const onChange = vi.fn()
    render(
      <Segmented
        aria-label="Фильтр репозиториев"
        defaultValue="all"
        onChange={onChange}
        options={[
          { label: 'Все', value: 'all' },
          { label: 'На паузе', value: 'paused', disabled: true },
          { label: 'Активные', value: 'active' },
        ]}
      />,
    )
    fireEvent.keyDown(screen.getByRole<HTMLInputElement>('radio', { name: 'Все' }), {
      key: 'ArrowRight',
    })
    expect(onChange).toHaveBeenCalledExactlyOnceWith('active')
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Активные' }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'На паузе' }).disabled).toBe(true)
  })

  it('preserves generic values and waits for the caller to update a controlled selection', () => {
    const onChange = vi.fn<(value: 1 | 2) => void>()
    const props = { 'aria-label': 'Версия', onChange }
    const first = render(<Segmented<1 | 2> {...props} options={[1, 2]} value={1} />)
    fireEvent.click(screen.getByRole<HTMLInputElement>('radio', { name: '2' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(2)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '1' }).checked).toBe(true)
    first.rerender(<Segmented<1 | 2> {...props} options={[1, 2]} value={2} />)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '2' }).checked).toBe(true)
  })

  it('passes caller class, size, ref and explicit radio name to Ant Design', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Segmented
        aria-label="Вид диффа"
        className="caller-class"
        name="diff-view"
        options={['Unified', 'Split']}
        ref={ref}
        size="small"
      />,
    )
    const group = screen.getByRole('radiogroup', { name: 'Вид диффа' })
    expect(group.classList.contains('caller-class')).toBe(true)
    expect(group.classList.contains('ant-segmented-sm')).toBe(true)
    expect(ref.current).toBe(group)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Unified' }).name).toBe('diff-view')
  })

  it('keeps explicit group names separate and preserves disabled state', () => {
    render(
      <>
        <Segmented aria-label="Первый файл" name="first-diff" options={['Unified', 'Split']} />
        <Segmented
          aria-label="Второй файл"
          disabled
          name="second-diff"
          options={['Unified', 'Split']}
        />
      </>,
    )
    const first = within(screen.getByRole('radiogroup', { name: 'Первый файл' })).getAllByRole(
      'radio',
    )
    const second = within(screen.getByRole('radiogroup', { name: 'Второй файл' })).getAllByRole(
      'radio',
    )
    expect((first[0] as HTMLInputElement).name).toBe((first[1] as HTMLInputElement).name)
    expect((second[0] as HTMLInputElement).name).not.toBe((first[0] as HTMLInputElement).name)
    for (const radio of second) expect((radio as HTMLInputElement).disabled).toBe(true)
  })
})
