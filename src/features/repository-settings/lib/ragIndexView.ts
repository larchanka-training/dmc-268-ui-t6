import type { RagIndex } from '../../../entities/repository'

export const RAG_LABEL = 'RAG'
export const RAG_HINT =
  'RAG добавляет в контекст ревью связанные символы из графа репозитория и увеличивает стоимость ревью. Индекс хранит только граф символов и указатели (путь, строки, commit) — текст кода не хранится.'
export const RAG_NO_ACCESS_TEXT = 'Нет доступа GitHub App — RAG недоступен'
export const RAG_ERROR_TITLE = 'Не удалось изменить настройку RAG'
export const RAG_POLL_TIMED_OUT_TEXT = 'Автообновление остановлено — обновите страницу'
export const RAG_STALE_DETAIL = 'индекс отстаёт от default branch, используется'

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
  /** `lastErrorCode` of a `failed` index, as the server sent it. */
  code: string | null
}

/** The seven characters git itself shows; the full sha stays in a tooltip. */
export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

/**
 * `2026-10-14 09:30:15`: the same text as the rules status. The time is UTC and the section
 * labels it, like the run header does.
 */
export function formatIndexedAt(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19)
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
    code: null,
  }
  if (!ragEnabled) {
    return base
  }
  switch (index.status) {
    case 'disabled':
    case 'empty':
      return { ...base, label: 'Не построен' }
    case 'building':
      return { ...base, label: 'Строится…', tone: 'info', pulse: true }
    case 'ready':
      return {
        ...base,
        label: index.fileCount === 0 ? 'Готов — репозиторий пустой' : 'Готов',
        tone: 'success',
        publication: publicationOf(index),
      }
    case 'stale':
      return {
        ...base,
        label: 'Устарел',
        tone: 'warning',
        publication: publicationOf(index),
        detail: RAG_STALE_DETAIL,
      }
    case 'failed':
      return { ...base, label: 'Ошибка', tone: 'danger', code: index.lastErrorCode }
  }
}
