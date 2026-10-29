import { i18n } from '../../../shared/i18n'

/**
 * The `errorCode` values the dictionaries have a text for (`reasons.*`): every code the api writes
 * to a run (the check-run catalog in check_runs.py, the publication,
 * installation and GitLab codes, `repo_disabled`), the Bitbucket codes of api#340
 * and the codes PIPELINE_SPEC §6 reserves for publication. A code the api adds later reads
 * "Unknown reason" until it is added here.
 */
export const REASON_CODES = [
  'llm_timeout',
  'llm_rate_limited',
  'llm_payment_required',
  'llm_unavailable',
  'llm_invalid_output',
  'llm_context_overflow',
  'budget_exceeded',
  'deadline_exceeded',
  'diff_fetch_failed',
  'commit_messages_fetch_failed',
  'github_forbidden',
  'github_publish_failed',
  'pr_base_changed',
  'lease_expired',
  'internal_error',
  'superseded',
  'cancelled_by_user',
  'pr_closed',
  'repo_disabled',
  'rule_not_matched',
  'all_changes_ignored',
  'no_changes',
  'budget_paused',
  'verification_context_overflow',
  'verification_invalid_output',
  'verification_unavailable',
  'verification_budget_exceeded',
  'verification_deadline_exceeded',
  'gitlab_forbidden',
  'gitlab_publish_failed',
  'bitbucket_forbidden',
  'bitbucket_publish_failed',
  'bitbucket_fetch_failed',
  'bitbucket_commit_messages_fetch_failed',
  'bitbucket_source_unavailable',
  'bitbucket_review_limit_exceeded',
  'bitbucket_request_budget_exceeded',
  'bitbucket_invalid_response',
  'bitbucket_response_budget_exceeded',
  'bitbucket_engine_unsupported',
  'publication_payload_too_large',
  'publication_outcome_unknown',
  'legacy_publication_unresolved',
  'snapshot_integrity_error',
  'installation_unavailable',
  'installation_replaced',
  'installation_revoked',
  'credential_rotated',
  'run_inactive',
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
] as const

export type ReasonCode = (typeof REASON_CODES)[number]

/** Whether the dictionaries have a text of their own for the code; `constructor` is not one. */
export function isKnownReasonCode(code: string): code is ReasonCode {
  return REASON_CODES.some((known) => known === code)
}

/**
 * Why a run failed or stopped, in the interface language. The api sends a code only; a code
 * this build does not know yet reads "Unknown reason" with the code itself.
 */
export function reasonText(code: string): string {
  return isKnownReasonCode(code) ? i18n.t(`reasons.${code}`) : i18n.t('reasons.unknown', { code })
}
