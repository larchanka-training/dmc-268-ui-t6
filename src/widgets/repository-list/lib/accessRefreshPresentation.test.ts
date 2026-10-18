import { describe, expect, it } from 'vitest'

import {
  ACCESS_REFRESH_LOADING_TEXT,
  ACCESS_REFRESH_TIMEOUT_ACTION_TEXT,
  ACCESS_REFRESH_TIMEOUT_PROMPT,
  resolveAccessRefreshPresentation,
} from './accessRefreshPresentation'

describe('access refresh presentation', () => {
  it.each([
    ['idle', false, { kind: 'empty', announcement: '' }],
    ['idle', true, { kind: 'empty', announcement: '' }],
    ['waiting', false, { kind: 'empty', announcement: '' }],
    ['waiting', true, { kind: 'loading', announcement: 'Загрузка репозиториев' }],
    [
      'timedOut',
      false,
      { kind: 'timedOut', announcement: 'Нужного репозитория нет? Обновите список.' },
    ],
    [
      'timedOut',
      true,
      { kind: 'timedOut', announcement: 'Нужного репозитория нет? Обновите список.' },
    ],
  ] as const)('resolves %s with refreshing=%s', (status, refreshing, expected) => {
    expect(resolveAccessRefreshPresentation(status, refreshing)).toEqual(expected)
  })

  it('keeps the existing visible Russian copy', () => {
    expect(ACCESS_REFRESH_LOADING_TEXT).toBe('Загрузка репозиториев')
    expect(ACCESS_REFRESH_TIMEOUT_PROMPT).toBe('Нужного репозитория нет?')
    expect(ACCESS_REFRESH_TIMEOUT_ACTION_TEXT).toBe('Обновить список')
  })
})
