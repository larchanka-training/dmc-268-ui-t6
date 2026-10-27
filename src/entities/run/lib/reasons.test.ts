import { afterEach, describe, expect, it } from 'vitest'

import { i18n } from '../../../shared/i18n'
import { en } from '../../../shared/i18n/locales/en'
import { ru } from '../../../shared/i18n/locales/ru'
import { isKnownReasonCode, REASON_CODES, reasonText } from './reasons'

const testLanguage = i18n.language

afterEach(async () => {
  await i18n.changeLanguage(testLanguage)
})

describe('reasonText', () => {
  it('reads the English text of a known code', async () => {
    await i18n.changeLanguage('en')
    expect(reasonText('llm_timeout')).toBe(
      'The model did not answer in time. You can restart the run.',
    )
    expect(reasonText('pr_closed')).toBe('The pull request is closed.')
  })

  it('reads the Russian text of a known code, as the api check-run says it', async () => {
    await i18n.changeLanguage('ru')
    expect(reasonText('llm_timeout')).toBe(
      'Модель не ответила вовремя. Прогон можно перезапустить из UI.',
    )
    expect(reasonText('policy_ignore_pattern_invalid')).toBe(
      'В блоке review-ignore недопустимая маска.',
    )
  })

  it('names an unknown code in either language', async () => {
    await i18n.changeLanguage('en')
    expect(reasonText('queue_lost')).toBe('Unknown reason: queue_lost')
    await i18n.changeLanguage('ru')
    expect(reasonText('queue_lost')).toBe('Неизвестная причина: queue_lost')
  })

  it('does not take an object member for a code', async () => {
    await i18n.changeLanguage('en')
    expect(isKnownReasonCode('constructor')).toBe(false)
    expect(reasonText('constructor')).toBe('Unknown reason: constructor')
  })
})

// Every errorCode the api writes to a run, by where it comes from (api main, #341), plus the
// publication codes PIPELINE_SPEC §6 reserves. None of them may read "Unknown reason".
const API_RUN_CODES = [
  // run_failures.py KNOWN_ERROR_CODES and the RunFailure codes raised directly
  'llm_timeout',
  'llm_rate_limited',
  'llm_payment_required',
  'llm_unavailable',
  'llm_invalid_output',
  'llm_context_overflow',
  'verification_context_overflow',
  'verification_invalid_output',
  'verification_unavailable',
  'verification_budget_exceeded',
  'verification_deadline_exceeded',
  'budget_exceeded',
  'deadline_exceeded',
  'diff_fetch_failed',
  'commit_messages_fetch_failed',
  'github_forbidden',
  'github_publish_failed',
  'pr_base_changed',
  'lease_expired',
  'internal_error',
  // policy_errors.py PolicyErrorCode
  'policy_document_too_large',
  'policy_document_decode_error',
  'policy_document_control_character',
  'policy_document_type_unsupported',
  'policy_ignore_block_duplicate',
  'policy_ignore_block_nested',
  'policy_ignore_block_unclosed',
  'policy_ignore_info_invalid',
  'policy_ignore_pattern_invalid',
  'policy_ignore_limit_exceeded',
  'policy_path_invalid',
  'policy_match_budget_exceeded',
  'policy_prompt_budget_exceeded',
  'policy_access_denied',
  'policy_revision_unavailable',
  'policy_fetch_transient',
  'policy_rate_limited',
  'policy_snapshot_integrity_error',
  'policy_context_violation',
  // publish_run_review.py with the gitlab route
  'gitlab_forbidden',
  'gitlab_publish_failed',
  // cancellations: run_failures.cancellation_reason, the run store, rebinding, GitLab connections
  'pr_closed',
  'superseded',
  'cancelled_by_user',
  'installation_unavailable',
  'installation_replaced',
  'installation_revoked',
  'credential_rotated',
  'run_inactive',
  // skips: handle_review_run.py and review_context_stage.py
  'repo_disabled',
  'rule_not_matched',
  'budget_paused',
  'all_changes_ignored',
  'no_changes',
  // reserved by PIPELINE_SPEC §6
  'publication_payload_too_large',
  'publication_outcome_unknown',
  'legacy_publication_unresolved',
  'snapshot_integrity_error',
]

describe('reason dictionaries', () => {
  it.each(API_RUN_CODES)('have a text of their own for the api code %s', async (code) => {
    expect(isKnownReasonCode(code)).toBe(true)
    await i18n.changeLanguage('en')
    expect(reasonText(code)).not.toMatch(/^Unknown reason/)
    await i18n.changeLanguage('ru')
    expect(reasonText(code)).not.toMatch(/^Неизвестная причина/)
  })

  it('know no code the api does not write', () => {
    expect([...REASON_CODES].sort()).toEqual([...API_RUN_CODES].sort())
  })

  it('have a text for every known code and nothing else but the fallback', () => {
    const expected = [...REASON_CODES, 'unknown'].sort()
    expect(Object.keys(en.reasons).sort()).toEqual(expected)
    expect(Object.keys(ru.reasons).sort()).toEqual(expected)
  })

  it('give each code a text of its own in each language', () => {
    for (const code of REASON_CODES) {
      expect(en.reasons[code]).not.toBe(ru.reasons[code])
      expect(en.reasons[code].length).toBeGreaterThan(0)
    }
  })
})
