import type { RagIndex } from '../../../entities/repository'

export const RAG_LABEL = 'RAG'
export const RAG_HINT =
  'Учитывает связи между файлами репозитория, делая ревью точнее. Может увеличить стоимость. Хранится только структура кода, не его текст.'
export const RAG_NO_ACCESS_TEXT = 'Нет доступа GitHub App — RAG недоступен'
export const RAG_ERROR_TITLE = 'Не удалось изменить настройку RAG'
export const RAG_POLL_TIMED_OUT_TEXT = 'Автообновление остановлено — обновите страницу'
export const RAG_STALE_DETAIL = 'индекс отстаёт от default branch, используется'
export const RAG_LAST_BUILD_FAILED = 'Последняя сборка не удалась'

export interface RagIndexView {
  /** The status text. */
  label: string
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  /** `true` only while the index builds. */
  pulse: boolean
  /** The published index (`ready`, `stale`): its commit, the short form of it, and when. */
  publication: { sha: string; shortSha: string; indexedAt: string } | null
  /** An explanation next to the status; only `stale` has one. */
  detail: string | null
  /**
   * Why the last build attempt ended without a publication: `lastErrorCode` as the server sent it,
   * and a text for the codes that have one. A `failed` index carries its refusal here; any other
   * status (but `disabled`) may carry the code of a later attempt next to what it shows.
   */
  reason: { code: string; text: string | null } | null
}

/** The seven characters git itself shows; the full sha stays in a tooltip. */
export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

/**
 * `2026-10-14 09:30:15`: the same text as the rules status. The time is UTC and carries no label,
 * like every other time in the app; showing local time app-wide is a separate issue (ui#129).
 */
export function formatIndexedAt(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19)
}

// The api catalog of `lastErrorCode` (`app/modules/code_index/domain/codes.py`, api#228/#242): the
// codes of a `failed` index first, then the soft ones, left by a job that ended without a
// publication, then the `policy_*` codes of reading `.review/rules.md` (healable
// `policy_fetch_transient` and `policy_rate_limited`; the rest terminal). The first two `policy_*`
// texts are the rules block's own (`widgets/repository-rules/lib/rulesStatusView.ts`), copied
// verbatim: a feature does not import a widget's `lib`.
const ERROR_REASONS: Record<string, string> = {
  archive_unsafe: 'архив репозитория отклонён проверкой безопасности',
  'limit_exceeded:download_bytes': 'превышен лимит размера архива',
  'limit_exceeded:unpacked_bytes': 'превышен лимит распакованного размера',
  'limit_exceeded:archive_entries': 'превышен лимит числа файлов в архиве',
  'limit_exceeded:parsed_files': 'превышен лимит разобранных файлов',
  'limit_exceeded:symbols': 'превышен лимит символов',
  'limit_exceeded:edges': 'превышен лимит рёбер',
  'limit_exceeded:deadline': 'превышено время сборки',
  'limit_exceeded:repository_storage': 'превышен лимит хранения для репозитория',
  'limit_exceeded:workspace_storage': 'превышен лимит хранения для Workspace',
  internal_error: 'внутренняя ошибка сборки',
  vcs_unavailable: 'GitHub временно недоступен',
  vcs_rate_limited: 'GitHub ограничил число запросов',
  vcs_access_denied: 'у GitHub App нет доступа к репозиторию',
  policy_access_denied: 'У GitHub App нет доступа к репозиторию',
  policy_revision_unavailable:
    'Ревизия default branch недоступна: GitHub не подтвердил, есть ли файл правил.',
  policy_fetch_transient: 'GitHub временно не отвечает при чтении .review/rules.md',
  policy_rate_limited: 'GitHub ограничил число запросов при чтении .review/rules.md',
  policy_document_too_large: 'файл .review/rules.md больше лимита',
  policy_document_type_unsupported: 'неподдерживаемый тип файла .review/rules.md',
}

/**
 * The text of an error code, or null for a code that has none: the code shows alone, no text is
 * guessed from its shape. A code is looked up only where it is a key of the map, so `constructor`
 * is not.
 */
function errorReason(code: string): string | null {
  if (Object.keys(ERROR_REASONS).includes(code)) {
    return ERROR_REASONS[code] ?? null
  }
  return null
}

function publicationOf(index: RagIndex): RagIndexView['publication'] {
  // The contract sets both for `ready` and `stale`; a gap shows no publication instead of a throw.
  if (index.indexedCommitSha === null || index.indexedAt === null) {
    return null
  }
  return {
    sha: index.indexedCommitSha,
    shortSha: shortSha(index.indexedCommitSha),
    indexedAt: formatIndexedAt(index.indexedAt),
  }
}

/**
 * What the section says about the index. `ragEnabled` is what the user sees on the switch: with RAG
 * off the index is not used whatever its status is. The same status next to RAG on is the window
 * before the response of the PATCH (the optimistic update flips `ragEnabled` while `ragIndex` lags
 * one answer), so it reads as an index that is not built yet.
 */
export function ragIndexView(index: RagIndex, ragEnabled: boolean): RagIndexView {
  const base: RagIndexView = {
    label: 'Выключен',
    tone: 'neutral',
    pulse: false,
    publication: null,
    detail: null,
    reason: null,
  }
  if (!ragEnabled) {
    return base
  }
  const code = index.lastErrorCode
  const on: RagIndexView = {
    ...base,
    reason: code === null ? null : { code, text: errorReason(code) },
  }
  switch (index.status) {
    case 'disabled':
    case 'empty':
      return { ...on, label: 'Не построен' }
    case 'building':
      return { ...on, label: 'Строится…', tone: 'info', pulse: true }
    case 'ready':
      return {
        ...on,
        label: index.fileCount === 0 ? 'Готов — репозиторий пустой' : 'Готов',
        tone: 'success',
        publication: publicationOf(index),
      }
    case 'stale':
      return {
        ...on,
        label: 'Устарел',
        tone: 'warning',
        publication: publicationOf(index),
        detail: RAG_STALE_DETAIL,
      }
    case 'failed':
      return { ...on, label: 'Ошибка', tone: 'danger' }
  }
}
