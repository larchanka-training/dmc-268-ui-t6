import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { runDetailLoadMessage, runDiffLoadMessage } from './runLoadErrors'

describe('run load error messages', () => {
  it('maps ZodError on run detail to a Russian schema message', () => {
    expect(runDetailLoadMessage(new ZodError([]))).toBe('Ответ сервера не прошёл проверку схемы')
  })

  it('maps ZodError on diff to a Russian schema message', () => {
    expect(runDiffLoadMessage(new ZodError([]))).toBe('Дифф: некорректный ответ сервера')
  })

  it('maps run 404 to not found copy', () => {
    expect(runDetailLoadMessage(new ApiError(404, 'Not Found', null))).toBe('Прогон не найден')
  })
})
