import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'

export function runDetailLoadMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'Прогон не найден'
    }
    return 'Не удалось загрузить прогон'
  }
  if (error instanceof ZodError) {
    return 'Ответ сервера не прошёл проверку схемы'
  }
  return 'Ошибка загрузки прогона'
}

export function runDiffLoadMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'Дифф для этого прогона не найден'
    }
    return 'Не удалось загрузить дифф'
  }
  if (error instanceof ZodError) {
    return 'Дифф: некорректный ответ сервера'
  }
  return 'Ошибка загрузки диффа'
}
