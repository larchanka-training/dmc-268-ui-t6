import type { RagIndex } from '../../../entities/repository'
import type { ParseKeys } from 'i18next'
import {
  VCS_ACCESS_NAME,
  VCS_PROVIDER_LABEL,
  type VcsProvider,
} from '../../../shared/model/provider'

import { formatDateTime, i18n } from '../../../shared/i18n'

/** The name of the feature: the same in every language. */
export const RAG_LABEL = 'RAG'

export function ragHint(): string {
  return i18n.t('settings.rag.hint')
}
export function ragNoAccessText(provider: VcsProvider = 'github'): string {
  return i18n.t('settings.rag.noAccess', { accessName: VCS_ACCESS_NAME[provider] })
}
export function ragErrorTitle(): string {
  return i18n.t('settings.rag.changeFailed')
}
export function ragPollTimedOutText(): string {
  return i18n.t('settings.rag.pollTimedOut')
}
export function ragStaleDetail(): string {
  return i18n.t('settings.rag.staleDetail')
}
export function ragLastBuildFailed(): string {
  return i18n.t('settings.rag.lastBuildFailed')
}

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
 * The same text as the rules status, in the notation of the current language. The time is UTC and
 * carries no label, like every other time in the app; showing local time app-wide is a separate
 * issue (ui#129).
 */
export function formatIndexedAt(iso: string): string {
  return formatDateTime(iso)
}

// The api catalog of `lastErrorCode` (`app/modules/code_index/domain/codes.py`, api#228/#242): the
// codes of a `failed` index first, then the soft ones, left by a job that ended without a
// publication, then the `policy_*` codes of reading `.review/rules.md` (healable
// `policy_fetch_transient` and `policy_rate_limited`; the rest terminal). The texts live in the
// dictionaries (`settings.rag.reasons`); the first two `policy_*` ones repeat the rules block's
// own (`rules.reasons`) in lower case.
const ERROR_REASON_KEYS: Record<string, ParseKeys> = {
  archive_unsafe: 'settings.rag.reasons.archive_unsafe',
  'limit_exceeded:download_bytes': 'settings.rag.reasons.limit_exceeded.download_bytes',
  'limit_exceeded:unpacked_bytes': 'settings.rag.reasons.limit_exceeded.unpacked_bytes',
  'limit_exceeded:archive_entries': 'settings.rag.reasons.limit_exceeded.archive_entries',
  'limit_exceeded:parsed_files': 'settings.rag.reasons.limit_exceeded.parsed_files',
  'limit_exceeded:symbols': 'settings.rag.reasons.limit_exceeded.symbols',
  'limit_exceeded:edges': 'settings.rag.reasons.limit_exceeded.edges',
  'limit_exceeded:deadline': 'settings.rag.reasons.limit_exceeded.deadline',
  'limit_exceeded:repository_storage': 'settings.rag.reasons.limit_exceeded.repository_storage',
  'limit_exceeded:workspace_storage': 'settings.rag.reasons.limit_exceeded.workspace_storage',
  internal_error: 'settings.rag.reasons.internal_error',
  vcs_unavailable: 'settings.rag.reasons.vcs_unavailable',
  vcs_rate_limited: 'settings.rag.reasons.vcs_rate_limited',
  vcs_access_denied: 'settings.rag.reasons.vcs_access_denied',
  policy_access_denied: 'settings.rag.reasons.policy_access_denied',
  policy_revision_unavailable: 'settings.rag.reasons.policy_revision_unavailable',
  policy_fetch_transient: 'settings.rag.reasons.policy_fetch_transient',
  policy_rate_limited: 'settings.rag.reasons.policy_rate_limited',
  policy_document_too_large: 'settings.rag.reasons.policy_document_too_large',
  policy_document_type_unsupported: 'settings.rag.reasons.policy_document_type_unsupported',
}

/**
 * The text of an error code, or null for a code that has none: the code shows alone, no text is
 * guessed from its shape. A code is looked up only where it is a key of the map, so `constructor`
 * is not.
 */
function errorReason(code: string, provider: VcsProvider): string | null {
  if (provider !== 'github') {
    const name = VCS_ACCESS_NAME[provider]
    const accessName = VCS_ACCESS_NAME[provider]
    switch (code) {
      case 'vcs_unavailable':
        return i18n.t('settings.rag.providerReasons.vcs_unavailable', { name })
      case 'vcs_rate_limited':
        return i18n.t('settings.rag.providerReasons.vcs_rate_limited', { name })
      case 'vcs_access_denied':
      case 'policy_access_denied':
        return i18n.t('settings.rag.providerReasons.access_denied', { accessName })
      case 'policy_revision_unavailable':
        return i18n.t('settings.rag.providerReasons.policy_revision_unavailable', { name })
      case 'policy_fetch_transient':
        return i18n.t('settings.rag.providerReasons.policy_fetch_transient', { name })
      case 'policy_rate_limited':
        return i18n.t('settings.rag.providerReasons.policy_rate_limited', { accessName })
    }
  }
  if (Object.keys(ERROR_REASON_KEYS).includes(code)) {
    const key = ERROR_REASON_KEYS[code]
    return key === undefined ? null : i18n.t(key)
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
export function ragIndexView(
  index: RagIndex,
  ragEnabled: boolean,
  provider: VcsProvider,
): RagIndexView {
  const base: RagIndexView = {
    label: i18n.t('settings.rag.status.off'),
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
    reason: code === null ? null : { code, text: errorReason(code, provider) },
  }
  switch (index.status) {
    case 'disabled':
    case 'empty':
      return { ...on, label: i18n.t('settings.rag.status.notBuilt') }
    case 'building':
      return { ...on, label: i18n.t('settings.rag.status.building'), tone: 'info', pulse: true }
    case 'ready':
      return {
        ...on,
        label:
          index.fileCount === 0
            ? i18n.t('settings.rag.status.readyEmpty')
            : i18n.t('settings.rag.status.ready'),
        tone: 'success',
        publication: publicationOf(index),
      }
    case 'stale':
      return {
        ...on,
        label: i18n.t('settings.rag.status.stale'),
        tone: 'warning',
        publication: publicationOf(index),
        detail: ragStaleDetail(),
      }
    case 'failed':
      return { ...on, label: i18n.t('settings.rag.status.failed'), tone: 'danger' }
  }
}
