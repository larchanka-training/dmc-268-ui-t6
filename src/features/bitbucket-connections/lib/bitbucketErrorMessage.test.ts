import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { i18n } from '../../../shared/i18n'
import { bitbucketErrorMessage } from './bitbucketErrorMessage'

describe('bitbucketErrorMessage', () => {
  it('uses the current language when mapping an error', async () => {
    const error = new ApiError(400, 'secret detail', { detail: 'invalid_credential' })
    expect(bitbucketErrorMessage(error)).toBe(
      'API token Bitbucket недействителен. Проверьте token и его права.',
    )
    try {
      await i18n.changeLanguage('en')
      expect(bitbucketErrorMessage(error)).toBe(
        'The Bitbucket API token is invalid. Check the token and its permissions.',
      )
    } finally {
      await i18n.changeLanguage('ru')
    }
  })

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
    [401, 'private-session-detail', 'Сессия истекла. Войдите повторно.'],
    [403, 'private-permission-detail', 'Недостаточно прав для подключения Bitbucket.'],
    [
      409,
      'unrecognized_conflict',
      'Данные подключения Bitbucket изменились. Обновите список и повторите попытку.',
    ],
    [500, 'private-server-detail', 'Сервис временно недоступен. Повторите позже.'],
    [504, 'private-gateway-detail', 'Сервис временно недоступен. Повторите позже.'],
  ] as const)('maps %i %s to a fixed Russian message', (status, detail, expected) => {
    const message = bitbucketErrorMessage(new ApiError(status, 'Provider error', { detail }))
    expect(message).toBe(expected)
    expect(message).not.toContain(detail)
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
