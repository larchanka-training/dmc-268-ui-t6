import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'
import {
  activeSimulationId,
  rejectedRulesDiagnostics,
  simulationFailureMessage,
  simulationReadErrorMessage,
  simulationStartErrorMessage,
} from './simulationErrors'

const ACTIVE_ID = '5a5a5a5a-5a5a-4a5a-8a5a-000000000007'

const diagnostic = {
  code: 'policy_ignore_pattern_invalid',
  message: 'Invalid mask',
  line: 4,
  column: 1,
  retryable: false,
}

const activeConflict = new ApiError(409, 'Conflict', {
  detail: 'active_simulation_exists',
  id: ACTIVE_ID,
})
const budgetConflict = new ApiError(409, 'Conflict', { detail: 'budget_paused' })
const rulesRejected = new ApiError(422, 'Unprocessable Entity', {
  detail: 'rules_invalid',
  diagnostics: [diagnostic],
})
const contentTooLarge = new ApiError(422, 'Unprocessable Entity', { detail: 'content_too_large' })

describe('activeSimulationId', () => {
  it('takes the id of the running simulation from a 409', () => {
    expect(activeSimulationId(activeConflict)).toBe(ACTIVE_ID)
  })

  it.each([
    ['a budget 409', budgetConflict],
    ['a 409 whose id is not a uuid', new ApiError(409, 'Conflict', { id: 'sim-7' })],
    ['an id outside a 409', new ApiError(422, 'Unprocessable Entity', { id: ACTIVE_ID })],
    ['not an api error', new Error('offline')],
  ])('has none for %s', (_name, error) => {
    expect(activeSimulationId(error)).toBeNull()
  })
})

describe('rejectedRulesDiagnostics', () => {
  it('takes the diagnostics of rules the server could not parse', () => {
    expect(rejectedRulesDiagnostics(rulesRejected)).toEqual([diagnostic])
  })

  it.each([
    ['an input over the limit', contentTooLarge],
    ['a 422 with an empty list', new ApiError(422, '', { diagnostics: [] })],
    ['diagnostics outside a 422', new ApiError(409, '', { diagnostics: [diagnostic] })],
    ['not an api error', new Error('offline')],
  ])('has none for %s', (_name, error) => {
    expect(rejectedRulesDiagnostics(error)).toBeNull()
  })
})

describe('simulationStartErrorMessage', () => {
  it.each([
    [
      'the budget is used up',
      budgetConflict,
      'Дневной бюджет workspace этого репозитория исчерпан: симуляция не запущена.',
    ],
    [
      'another simulation runs',
      new ApiError(409, 'Conflict', { detail: 'active_simulation_exists' }),
      'Предыдущая симуляция ещё идёт. Дождитесь её окончания.',
    ],
    [
      'the rules are not parsed',
      rulesRejected,
      'Правила не разобраны: ошибки отмечены в тексте правил.',
    ],
    [
      'the code is too large',
      contentTooLarge,
      'Код больше 64 КиБ. Сократите его и запустите снова.',
    ],
    [
      'another refusal of the input',
      new ApiError(422, 'Unprocessable Entity', {
        detail: [{ loc: ['body', 'mode'], msg: 'bad', type: 'enum' }],
      }),
      'Сервер не принял ввод. Проверьте код и имя файла.',
    ],
    [
      'too many simulations',
      new ApiError(429, 'Too Many Requests', { detail: 'simulation_rate_limited' }),
      'Слишком много симуляций. Повторите позже.',
    ],
    [
      'the repository is gone',
      new ApiError(404, 'Not Found', { detail: 'Not Found' }),
      'Репозиторий недоступен. Обновите страницу.',
    ],
    ['the answer breaks the schema', new ZodError([]), 'Ответ сервера не прошёл проверку схемы'],
    [
      'any other failure',
      new ApiError(500, 'Internal Server Error', { detail: 'Traceback (most recent call last)' }),
      'Не удалось запустить симуляцию. Повторите.',
    ],
    [
      'a network failure',
      new TypeError('Failed to fetch'),
      'Не удалось запустить симуляцию. Повторите.',
    ],
  ])('names %s by its code, never by the api detail', (_name, error, text) => {
    expect(simulationStartErrorMessage(error)).toBe(text)
  })
})

describe('simulationReadErrorMessage', () => {
  it.each([
    ['a schema mismatch', new ZodError([]), 'Ответ сервера не прошёл проверку схемы'],
    ['a missing simulation', new ApiError(404, 'Not Found', null), 'Симуляция не найдена.'],
    [
      'any other failure',
      new ApiError(502, 'Bad Gateway', null),
      'Не удалось получить состояние симуляции.',
    ],
  ])('names %s', (_name, error, text) => {
    expect(simulationReadErrorMessage(error)).toBe(text)
  })
})

describe('simulationFailureMessage', () => {
  it('tells a missed deadline from a model failure', () => {
    expect(simulationFailureMessage('deadline_exceeded')).toBe(
      'Симуляция не уложилась в отведённое время.',
    )
    expect(simulationFailureMessage('provider_timeout')).toBe(
      'Модель не завершила ревью. Повторите позже.',
    )
  })
})
