import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { bitbucketErrorMessage } from './bitbucketErrorMessage'

describe('bitbucketErrorMessage', () => {
  it.each([
    [
      409,
      'credential_rotation_required',
      'Сначала обновите общий API token Bitbucket для этого подключения.',
    ],
    [400, 'invalid_credential', 'API token Bitbucket недействителен. Проверьте token и его права.'],
    [
      422,
      'repository_inaccessible',
      'Репозиторий Bitbucket недоступен этому API token. Проверьте права доступа.',
    ],
    [
      404,
      'repository_not_found',
      'Репозиторий или подключение Bitbucket не найдено. Обновите список.',
    ],
    [429, 'provider_rate_limited', 'Bitbucket ограничил частоту запросов. Повторите позже.'],
    [502, 'provider_unavailable', 'Bitbucket временно недоступен. Повторите позже.'],
    [503, 'credential_unavailable', 'Подключение Bitbucket временно недоступно. Повторите позже.'],
  ] as const)('maps %i %s to a fixed Russian message', (status, detail, expected) => {
    expect(bitbucketErrorMessage(new ApiError(status, 'Provider error', { detail }))).toBe(expected)
  })

  it('never renders unknown server detail or the ApiError message', () => {
    const marker = 'unsafe-private-provider-detail'

    const message = bitbucketErrorMessage(
      new ApiError(422, 'Unprocessable Entity', { detail: marker }),
    )

    expect(message).toBe('Проверьте данные подключения Bitbucket и повторите попытку.')
    expect(message).not.toContain(marker)
  })

  it('does not show Zod issues, arbitrary exceptions, or network implementation text', () => {
    const invalid = z.object({ status: z.literal('active') }).safeParse({ status: 'secret' })
    if (invalid.success) throw new Error('expected invalid fixture')

    expect(bitbucketErrorMessage(invalid.error)).toBe(
      'Неожиданный формат ответа сервера. Обновите страницу и повторите попытку.',
    )
    expect(bitbucketErrorMessage(new Error('unsafe-internal-stack'))).toBe(
      'Не удалось выполнить операцию Bitbucket. Повторите попытку.',
    )
    expect(bitbucketErrorMessage(new TypeError('Failed to fetch private URL'))).toBe(
      'Ошибка сети. Проверьте подключение к интернету.',
    )
  })
})
