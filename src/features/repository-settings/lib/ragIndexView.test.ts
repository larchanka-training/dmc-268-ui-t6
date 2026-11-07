import { afterAll, beforeAll, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { disabledRagIndex, type RagIndex } from '../../../entities/repository'
import { i18n } from '../../../shared/i18n'
import type { VcsProvider } from '../../../shared/model/provider'
import {
  ragStaleDetail,
  ragNoAccessText,
  ragIndexView,
  shortSha,
  type RagIndexView,
} from './ragIndexView'

const SHA = '0123456789abcdef0123456789abcdef01234567'
const INDEXED_AT = '2026-10-14T09:30:15.000Z'

beforeAll(() => {
  vi.stubEnv('TZ', 'Asia/Tokyo')
})

afterAll(() => {
  vi.unstubAllEnvs()
})

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
  indexedAt: '14.10.2026, 18:30:15',
}

describe('ragIndexView', () => {
  it('requires the repository provider', () => {
    expectTypeOf<Parameters<typeof ragIndexView>>().toEqualTypeOf<
      [RagIndex, boolean, VcsProvider]
    >()
  })

  it('says «Выключен» when RAG is off, whatever the index says', () => {
    expect(
      ragIndexView(index({ status: 'ready', ...PUBLISHED }), false, 'github'),
    ).toEqual<RagIndexView>({
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
      expect(ragIndexView(index({ status }), false, 'github').label).toBe('Выключен')
    },
  )

  it('treats `disabled` with RAG on as «Не построен»: the optimistic window before the response', () => {
    expect(ragIndexView(disabledRagIndex, true, 'github')).toEqual<RagIndexView>({
      label: 'Не построен',
      tone: 'neutral',
      pulse: false,
      publication: null,
      detail: null,
      reason: null,
    })
  })

  it('says «Не построен» for an `empty` index', () => {
    expect(ragIndexView(index({ status: 'empty' }), true, 'github')).toEqual<RagIndexView>({
      label: 'Не построен',
      tone: 'neutral',
      pulse: false,
      publication: null,
      detail: null,
      reason: null,
    })
  })

  it('says «Строится…» with a pulse for a `building` index', () => {
    expect(ragIndexView(index({ status: 'building' }), true, 'github')).toEqual<RagIndexView>({
      label: 'Строится…',
      tone: 'info',
      pulse: true,
      publication: null,
      detail: null,
      reason: null,
    })
  })

  it('says «Готов» with the publication for a `ready` index that has files', () => {
    expect(
      ragIndexView(index({ status: 'ready', ...PUBLISHED }), true, 'github'),
    ).toEqual<RagIndexView>({
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

    expect(ragIndexView(empty, true, 'github')).toEqual<RagIndexView>({
      label: 'Готов — репозиторий пустой',
      tone: 'success',
      pulse: false,
      publication: PUBLICATION,
      detail: null,
      reason: null,
    })
  })

  it('says «Устарел» with the publication and the explanation for a `stale` index', () => {
    expect(
      ragIndexView(index({ status: 'stale', ...PUBLISHED }), true, 'github'),
    ).toEqual<RagIndexView>({
      label: 'Устарел',
      tone: 'warning',
      pulse: false,
      publication: PUBLICATION,
      detail: ragStaleDetail(),
      reason: null,
    })
    expect(ragStaleDetail()).toBe('индекс отстаёт от default branch, используется')
  })

  it('says «Ошибка» with the reason and the raw error code for a `failed` index, and no publication', () => {
    expect(
      ragIndexView(
        index({ status: 'failed', lastErrorCode: 'limit_exceeded:symbols' }),
        true,
        'github',
      ),
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
      ragIndexView(index({ status: 'failed', lastErrorCode: null }), true, 'github'),
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
      const view = ragIndexView(index({ status, ...PUBLISHED, ...gap }), true, 'github')

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
    ['limit_exceeded:provider_requests', 'превышен лимит запросов к Git-провайдеру на сборку'],
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
    ['policy_access_denied', 'у GitHub App нет доступа к репозиторию'],
    [
      'policy_revision_unavailable',
      'ревизия default branch недоступна: GitHub не подтвердил, есть ли файл правил',
    ],
    ['policy_fetch_transient', 'GitHub временно не отвечает при чтении .review/rules.md'],
    ['policy_rate_limited', 'GitHub ограничил число запросов при чтении .review/rules.md'],
    ['policy_document_too_large', 'файл .review/rules.md больше лимита'],
    ['policy_document_type_unsupported', 'неподдерживаемый тип файла .review/rules.md'],
    // The errors of the file itself: what the owner can fix in `.review/rules.md`.
    ['policy_document_decode_error', 'файл .review/rules.md не в кодировке UTF-8'],
    [
      'policy_document_control_character',
      'в файле .review/rules.md недопустимый управляющий символ',
    ],
    ['policy_ignore_block_duplicate', 'в .review/rules.md больше одного блока review-ignore'],
    ['policy_ignore_block_nested', 'блок review-ignore в .review/rules.md не на верхнем уровне'],
    ['policy_ignore_block_unclosed', 'блок review-ignore в .review/rules.md не закрыт'],
    ['policy_ignore_info_invalid', 'у блока review-ignore в .review/rules.md лишние параметры'],
    [
      'policy_ignore_pattern_invalid',
      'в блоке review-ignore в .review/rules.md недопустимая маска',
    ],
    [
      'policy_ignore_limit_exceeded',
      'в блоке review-ignore в .review/rules.md слишком много масок или слишком длинная маска',
    ],
    // About a path in the repository, not about the rules file.
    ['policy_path_invalid', 'в репозитории есть файл с недопустимым путём'],
    // The index applies the masks to every path of the archive, so it can use up this budget too.
    [
      'policy_match_budget_exceeded',
      'маски review-ignore в .review/rules.md слишком сложны для проверки',
    ],
  ])('explains %s and keeps the code', (code, text) => {
    expect(
      ragIndexView(index({ status: 'failed', lastErrorCode: code }), true, 'github').reason,
    ).toEqual({
      code,
      text,
    })
  })

  it.each([
    [
      'limit_exceeded:provider_requests',
      'the limit of requests to the Git provider per build was exceeded',
    ],
    ['policy_document_decode_error', 'the .review/rules.md file is not valid UTF-8'],
    [
      'policy_document_control_character',
      'the .review/rules.md file has a control character that is not allowed',
    ],
    ['policy_ignore_block_duplicate', '.review/rules.md has more than one review-ignore block'],
    [
      'policy_ignore_block_nested',
      'the review-ignore block in .review/rules.md is not at the top level',
    ],
    ['policy_ignore_block_unclosed', 'the review-ignore block in .review/rules.md is not closed'],
    [
      'policy_ignore_info_invalid',
      'the review-ignore block in .review/rules.md has extra parameters',
    ],
    [
      'policy_ignore_pattern_invalid',
      'the review-ignore block in .review/rules.md has a mask that is not allowed',
    ],
    [
      'policy_ignore_limit_exceeded',
      'the review-ignore block in .review/rules.md has too many masks, or a mask is too long',
    ],
    ['policy_path_invalid', 'a file in the repository has a path that is not allowed'],
    [
      'policy_match_budget_exceeded',
      'the review-ignore masks in .review/rules.md are too costly to check',
    ],
  ])('explains %s in English', async (code, text) => {
    try {
      await i18n.changeLanguage('en')
      expect(
        ragIndexView(index({ status: 'failed', lastErrorCode: code }), true, 'github').reason,
      ).toEqual({ code, text })
    } finally {
      await i18n.changeLanguage('ru')
    }
  })

  it.each(['gitlab', 'bitbucket'] as const)(
    'explains a mistake in the rules file the same way for %s',
    (provider) => {
      expect(
        ragIndexView(
          index({ status: 'failed', lastErrorCode: 'policy_ignore_pattern_invalid' }),
          true,
          provider,
        ).reason?.text,
      ).toBe('в блоке review-ignore в .review/rules.md недопустимая маска')
    },
  )

  it('names Bitbucket in repository access and rate-limit failures', () => {
    expect(
      ragIndexView(
        index({ status: 'failed', lastErrorCode: 'vcs_access_denied' }),
        true,
        'bitbucket',
      ).reason,
    ).toEqual({
      code: 'vcs_access_denied',
      text: 'у Bitbucket Cloud нет доступа к репозиторию',
    })
    expect(
      ragIndexView(
        index({ status: 'failed', lastErrorCode: 'policy_rate_limited' }),
        true,
        'bitbucket',
      ).reason?.text,
    ).toBe('Bitbucket Cloud ограничил число запросов при чтении .review/rules.md')
  })

  it.each([
    ['gitlab', 'GitLab'],
    ['bitbucket', 'Bitbucket Cloud'],
  ] as const)('names %s for provider outage and VCS rate limit', (provider, name) => {
    expect(
      ragIndexView(index({ status: 'failed', lastErrorCode: 'vcs_unavailable' }), true, provider)
        .reason?.text,
    ).toBe(`${name} временно недоступен`)
    expect(
      ragIndexView(index({ status: 'failed', lastErrorCode: 'vcs_rate_limited' }), true, provider)
        .reason?.text,
    ).toBe(`${name} ограничил число запросов`)
  })

  it('describes a Bitbucket outage in the current language', async () => {
    const failed = index({ status: 'failed', lastErrorCode: 'vcs_unavailable' })
    expect(ragIndexView(failed, true, 'bitbucket').reason?.text).toBe(
      'Bitbucket Cloud временно недоступен',
    )
    try {
      await i18n.changeLanguage('en')
      expect(ragIndexView(failed, true, 'bitbucket').reason?.text).toBe(
        'Bitbucket Cloud is temporarily unavailable',
      )
    } finally {
      await i18n.changeLanguage('ru')
    }
  })

  // Only the Bitbucket snapshot source throws this code so far (api `bitbucket_snapshot_source.py`):
  // it is our request budget per build, not a rate limit of the provider (`vcs_rate_limited`).
  it('explains the request budget of a Bitbucket build in the current language', async () => {
    const code = 'limit_exceeded:provider_requests'
    const failed = index({ status: 'failed', lastErrorCode: code })
    expect(ragIndexView(failed, true, 'bitbucket').reason).toEqual({
      code,
      text: 'превышен лимит запросов к Git-провайдеру на сборку',
    })
    try {
      await i18n.changeLanguage('en')
      expect(ragIndexView(failed, true, 'bitbucket').reason).toEqual({
        code,
        text: 'the limit of requests to the Git provider per build was exceeded',
      })
    } finally {
      await i18n.changeLanguage('ru')
    }
  })

  it.each([
    ['github', 'GitHub App'],
    ['bitbucket', 'Bitbucket Cloud'],
  ] as const)('uses grammatical English RAG access text for %s', async (provider, accessName) => {
    try {
      await i18n.changeLanguage('en')
      expect(ragNoAccessText(provider)).toBe(`${accessName} has no access, so RAG is unavailable`)
    } finally {
      await i18n.changeLanguage('ru')
    }
  })

  it.each([
    'limit_exceeded:files',
    'limit_exceeded:bytes',
    'limit_exceeded:',
    'limit_exceeded:future_limit',
    'unknown_code',
    'constructor',
    // A code only a review writes: the dictionaries have a run text for it, the index has none.
    'policy_context_violation',
  ])('keeps the unknown code %s with no text', (code) => {
    expect(
      ragIndexView(index({ status: 'failed', lastErrorCode: code }), true, 'github').reason,
    ).toEqual({
      code,
      text: null,
    })
  })

  it('gives the reason of the last build for an `empty` index that carries a code', () => {
    expect(
      ragIndexView(
        index({ status: 'empty', lastErrorCode: 'limit_exceeded:archive_entries' }),
        true,
        'github',
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
      ragIndexView(
        index({ status: 'ready', ...PUBLISHED, lastErrorCode: 'internal_error' }),
        true,
        'github',
      ),
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
      ragIndexView(index({ status, ...PUBLISHED, lastErrorCode: 'internal_error' }), true, 'github')
        .reason,
    ).toEqual({ code: 'internal_error', text: 'внутренняя ошибка сборки' })
  })

  it.each(['disabled', 'empty', 'building', 'ready', 'stale', 'failed'] as const)(
    'gives no reason for the %s index while RAG is off',
    (status) => {
      expect(
        ragIndexView(index({ status, lastErrorCode: 'limit_exceeded:symbols' }), false, 'github')
          .reason,
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
