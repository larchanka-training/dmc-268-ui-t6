import { describe, expect, it } from 'vitest'

import { ApiError } from '../../../shared/api/client'
import { runDetailLoadMessage, runDiffLoadMessage } from './runLoadErrors'

describe('runLoadErrors', () => {
  it('maps run 404 to a dedicated message', () => {
    expect(runDetailLoadMessage(new ApiError(404, 'Not Found', null))).toBe('Прогон не найден')
  })

  it('maps diff 404 separately from generic errors', () => {
    expect(runDiffLoadMessage(new ApiError(404, 'Not Found', null))).toBe(
      'Дифф для этого прогона не найден',
    )
    expect(runDiffLoadMessage(new ApiError(500, 'Server Error', null))).toBe(
      'Не удалось загрузить дифф',
    )
  })
})
