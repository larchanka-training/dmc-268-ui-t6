import { describe, expect, it } from 'vitest'

import { disabledRagIndex, type RagIndex } from '../../../entities/repository'
import {
  RAG_STALE_DETAIL,
  formatIndexedAt,
  ragIndexView,
  shortSha,
  type RagIndexView,
} from './ragIndexView'

const SHA = '0123456789abcdef0123456789abcdef01234567'
const INDEXED_AT = '2026-10-14T09:30:15.000Z'

const PUBLISHED: Pick<RagIndex, 'indexedCommitSha' | 'indexedAt' | 'fileCount' | 'symbolCount'> = {
  indexedCommitSha: SHA,
  indexedAt: INDEXED_AT,
  fileCount: 214,
  symbolCount: 1730,
}

function index(overrides: Partial<RagIndex>): RagIndex {
  return { ...disabledRagIndex, ...overrides }
}

/** What the view shows once the index is published: the full sha, its short form and the time. */
const PUBLICATION: RagIndexView['publication'] = {
  sha: SHA,
  shortSha: '0123456',
  indexedAt: '2026-10-14 09:30:15',
}

describe('ragIndexView', () => {
  it('says «Выключен» when RAG is off, whatever the index says', () => {
    expect(ragIndexView(index({ status: 'ready', ...PUBLISHED }), false)).toEqual<RagIndexView>({
      label: 'Выключен',
      tone: 'neutral',
      pulse: false,
      publication: null,
      detail: null,
      reason: null,
    })
  })

  it.each(['disabled', 'empty', 'building', 'ready', 'stale', 'failed'] as const)(
    'says «Выключен» for the %s index while RAG is off',
    (status) => {
      expect(ragIndexView(index({ status }), false).label).toBe('Выключен')
    },
  )

  it('treats `disabled` with RAG on as «Не построен»: the optimistic window before the response', () => {
    expect(ragIndexView(disabledRagIndex, true)).toEqual<RagIndexView>({
      label: 'Не построен',
      tone: 'neutral',
      pulse: false,
      publication: null,
      detail: null,
      reason: null,
    })
  })

  it('says «Не построен» for an `empty` index', () => {
    expect(ragIndexView(index({ status: 'empty' }), true)).toEqual<RagIndexView>({
      label: 'Не построен',
      tone: 'neutral',
      pulse: false,
      publication: null,
      detail: null,
      reason: null,
    })
  })

  it('says «Строится…» with a pulse for a `building` index', () => {
    expect(ragIndexView(index({ status: 'building' }), true)).toEqual<RagIndexView>({
      label: 'Строится…',
      tone: 'info',
      pulse: true,
      publication: null,
      detail: null,
      reason: null,
    })
  })

  it('says «Готов» with the publication for a `ready` index that has files', () => {
    expect(ragIndexView(index({ status: 'ready', ...PUBLISHED }), true)).toEqual<RagIndexView>({
      label: 'Готов',
      tone: 'success',
      pulse: false,
      publication: PUBLICATION,
      detail: null,
      reason: null,
    })
  })

  it('says «Готов — репозиторий пустой» for a `ready` index with no files', () => {
    const empty = index({ status: 'ready', ...PUBLISHED, fileCount: 0, symbolCount: 0 })

    expect(ragIndexView(empty, true)).toEqual<RagIndexView>({
      label: 'Готов — репозиторий пустой',
      tone: 'success',
      pulse: false,
      publication: PUBLICATION,
      detail: null,
      reason: null,
    })
  })

  it('says «Устарел» with the publication and the explanation for a `stale` index', () => {
    expect(ragIndexView(index({ status: 'stale', ...PUBLISHED }), true)).toEqual<RagIndexView>({
      label: 'Устарел',
      tone: 'warning',
      pulse: false,
      publication: PUBLICATION,
      detail: RAG_STALE_DETAIL,
      reason: null,
    })
    expect(RAG_STALE_DETAIL).toBe('индекс отстаёт от default branch, используется')
  })

  it('says «Ошибка» with the reason and the raw error code for a `failed` index, and no publication', () => {
    expect(
      ragIndexView(index({ status: 'failed', lastErrorCode: 'limit_exceeded:symbols' }), true),
    ).toEqual<RagIndexView>({
      label: 'Ошибка',
      tone: 'danger',
      pulse: false,
      publication: null,
      detail: null,
      reason: { code: 'limit_exceeded:symbols', text: 'превышен лимит символов' },
    })
  })

  it('says «Ошибка» without a code when a `failed` index carries none', () => {
    expect(
      ragIndexView(index({ status: 'failed', lastErrorCode: null }), true),
    ).toEqual<RagIndexView>({
      label: 'Ошибка',
      tone: 'danger',
      pulse: false,
      publication: null,
      detail: null,
      reason: null,
    })
  })

  it.each([
    ['ready', { indexedCommitSha: null }],
    ['ready', { indexedAt: null }],
    ['stale', { indexedCommitSha: null }],
    ['stale', { indexedAt: null }],
  ] as const)(
    'shows no publication, and does not throw, for a `%s` index missing %j',
    (status, gap) => {
      const view = ragIndexView(index({ status, ...PUBLISHED, ...gap }), true)

      expect(view.publication).toBeNull()
      expect(view.label).toBe(status === 'ready' ? 'Готов' : 'Устарел')
    },
  )
})

describe('ragIndexView: the reason of the last build', () => {
  // The api catalog: `app/modules/code_index/domain/codes.py`, the `failed` codes and the soft ones,
  // and the `policy_*` codes of the rules reading (api#228/#242).
  it.each([
    ['archive_unsafe', 'архив репозитория отклонён проверкой безопасности'],
    ['limit_exceeded:download_bytes', 'превышен лимит размера архива'],
    ['limit_exceeded:unpacked_bytes', 'превышен лимит распакованного размера'],
    ['limit_exceeded:archive_entries', 'превышен лимит числа файлов в архиве'],
    ['limit_exceeded:parsed_files', 'превышен лимит разобранных файлов'],
    ['limit_exceeded:symbols', 'превышен лимит символов'],
    ['limit_exceeded:edges', 'превышен лимит рёбер'],
    ['limit_exceeded:deadline', 'превышено время сборки'],
    ['limit_exceeded:repository_storage', 'превышен лимит хранения для репозитория'],
    ['limit_exceeded:workspace_storage', 'превышен лимит хранения для Workspace'],
    ['internal_error', 'внутренняя ошибка сборки'],
    ['vcs_unavailable', 'GitHub временно недоступен'],
    ['vcs_rate_limited', 'GitHub ограничил число запросов'],
    ['vcs_access_denied', 'у GitHub App нет доступа к репозиторию'],
    // The `.review/rules.md` reading codes the index also writes (api#228/#242): the first two
    // texts are the rules block's own, the other four are healable or terminal reading failures.
    ['policy_access_denied', 'У GitHub App нет доступа к репозиторию'],
    [
      'policy_revision_unavailable',
      'Ревизия default branch недоступна: GitHub не подтвердил, есть ли файл правил.',
    ],
    ['policy_fetch_transient', 'GitHub временно не отвечает при чтении .review/rules.md'],
    ['policy_rate_limited', 'GitHub ограничил число запросов при чтении .review/rules.md'],
    ['policy_document_too_large', 'файл .review/rules.md больше лимита'],
    ['policy_document_type_unsupported', 'неподдерживаемый тип файла .review/rules.md'],
  ])('explains %s and keeps the code', (code, text) => {
    expect(ragIndexView(index({ status: 'failed', lastErrorCode: code }), true).reason).toEqual({
      code,
      text,
    })
  })

  it.each([
    'limit_exceeded:files',
    'limit_exceeded:bytes',
    'limit_exceeded:',
    'limit_exceeded:future_limit',
    'unknown_code',
    'constructor',
  ])('keeps the unknown code %s with no text', (code) => {
    expect(ragIndexView(index({ status: 'failed', lastErrorCode: code }), true).reason).toEqual({
      code,
      text: null,
    })
  })

  it('gives the reason of the last build for an `empty` index that carries a code', () => {
    expect(
      ragIndexView(
        index({ status: 'empty', lastErrorCode: 'limit_exceeded:archive_entries' }),
        true,
      ),
    ).toEqual<RagIndexView>({
      label: 'Не построен',
      tone: 'neutral',
      pulse: false,
      publication: null,
      detail: null,
      reason: {
        code: 'limit_exceeded:archive_entries',
        text: 'превышен лимит числа файлов в архиве',
      },
    })
  })

  it('gives the reason of the last build next to the publication of a `ready` index', () => {
    expect(
      ragIndexView(index({ status: 'ready', ...PUBLISHED, lastErrorCode: 'internal_error' }), true),
    ).toEqual<RagIndexView>({
      label: 'Готов',
      tone: 'success',
      pulse: false,
      publication: PUBLICATION,
      detail: null,
      reason: { code: 'internal_error', text: 'внутренняя ошибка сборки' },
    })
  })

  it.each(['building', 'stale'] as const)('gives the reason for a `%s` index too', (status) => {
    expect(
      ragIndexView(index({ status, ...PUBLISHED, lastErrorCode: 'internal_error' }), true).reason,
    ).toEqual({ code: 'internal_error', text: 'внутренняя ошибка сборки' })
  })

  it.each(['disabled', 'empty', 'building', 'ready', 'stale', 'failed'] as const)(
    'gives no reason for the %s index while RAG is off',
    (status) => {
      expect(
        ragIndexView(index({ status, lastErrorCode: 'limit_exceeded:symbols' }), false).reason,
      ).toBeNull()
    },
  )
})

describe('shortSha', () => {
  it('keeps the first seven characters', () => {
    expect(shortSha(SHA)).toBe('0123456')
  })

  it('leaves a shorter text as it is', () => {
    expect(shortSha('abc')).toBe('abc')
  })
})

describe('formatIndexedAt', () => {
  it('writes the UTC time as YYYY-MM-DD HH:mm:ss', () => {
    expect(formatIndexedAt(INDEXED_AT)).toBe('2026-10-14 09:30:15')
  })

  it('converts an offset time to UTC whatever the time zone of the runner is', () => {
    expect(formatIndexedAt('2026-10-14T12:30:15+03:00')).toBe('2026-10-14 09:30:15')
  })

  it('drops the fraction of a second', () => {
    expect(formatIndexedAt('2026-10-14T09:30:15.987Z')).toBe('2026-10-14 09:30:15')
  })
})
