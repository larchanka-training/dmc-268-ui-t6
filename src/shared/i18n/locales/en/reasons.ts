/**
 * Why a run failed, was cancelled or was skipped, by the `errorCode` of the run (api
 * PIPELINE_SPEC §6 and the `policy_*` codes of RULES_FORMAT_SPEC §9). The wording follows the
 * user docs (FAQ, Rules file). A code missing here is shown with `unknown`.
 */
export const reasons = {
  llm_timeout: 'The model did not answer in time. You can restart the run.',
  llm_rate_limited: 'The model provider limited the request rate. Restart the run later.',
  llm_payment_required: 'AI review is temporarily unavailable.',
  llm_unavailable: 'The model provider is unavailable.',
  llm_invalid_output: 'The model answer did not follow the contract.',
  llm_context_overflow: 'The change does not fit in the model context. Split the pull request.',
  budget_exceeded: 'The run hit its spending limit. Split the pull request.',
  deadline_exceeded: 'The run took too long. Restart it.',
  diff_fetch_failed: 'Could not get the diff from GitHub.',
  commit_messages_fetch_failed:
    'Could not get the commit messages of the pull request from GitHub.',
  github_forbidden: 'The GitHub App has no access to the repository or the pull request.',
  github_publish_failed: 'GitHub did not accept the review.',
  pr_base_changed:
    'The target branch of the pull request changed after the review started. Restart the review.',
  lease_expired: 'Processing was interrupted 3 times in a row.',
  internal_error: 'Internal service error.',
  superseded: 'The pull request has a new commit: the review will be for it.',
  cancelled_by_user: 'The run was cancelled in the app.',
  pr_closed: 'The pull request is closed.',
  repo_disabled: 'Automatic review was switched off before the run started.',
  rule_not_matched: 'The target branch does not match the branch filter.',
  all_changes_ignored: 'Every changed file is ignored, build output or binary.',
  no_changes: 'The pull request has no changed files. No review was done.',
  budget_paused: 'The daily budget is used up, reviews are paused.',
  verification_context_overflow: 'The data the check needs does not fit in the context.',
  verification_invalid_output: 'The checker answer did not follow the contract.',
  verification_unavailable: 'The checker is temporarily unavailable.',
  verification_budget_exceeded: 'The budget is not enough for the required check.',
  verification_deadline_exceeded: 'There is not enough time for the required check.',
  gitlab_forbidden: 'The GitLab integration has no access to the project or the merge request.',
  gitlab_publish_failed: 'GitLab did not accept the review.',
  bitbucket_forbidden:
    'The Bitbucket integration has no access to the repository or the pull request.',
  bitbucket_publish_failed: 'Bitbucket did not accept the review.',
  bitbucket_fetch_failed: 'Could not get review data from Bitbucket.',
  bitbucket_commit_messages_fetch_failed:
    'Could not get the pull request commit messages from Bitbucket.',
  bitbucket_source_unavailable: 'The Bitbucket source fork is unavailable.',
  bitbucket_review_limit_exceeded: 'The Bitbucket pull request has too many files for review.',
  bitbucket_request_budget_exceeded: 'The Bitbucket request limit for this review was reached.',
  bitbucket_invalid_response: 'Bitbucket returned invalid review data.',
  bitbucket_response_budget_exceeded: 'The Bitbucket response budget for this run was exhausted.',
  bitbucket_engine_unsupported: 'The selected review engine is not supported for Bitbucket.',
  publication_payload_too_large: 'The result is over the publication limit of the code host.',
  publication_outcome_unknown:
    'Could not confirm whether the review was published. It needs a check.',
  legacy_publication_unresolved: 'Could not reliably restore the earlier publication.',
  snapshot_integrity_error: 'The saved review snapshot failed its integrity check.',
  installation_unavailable:
    'The app installation of this repository is no longer available. Refresh access before a new run.',
  installation_replaced:
    'The repository moved to another app installation. Start a new run after refreshing access.',
  installation_revoked: 'The GitLab connection was revoked.',
  credential_rotated: 'The GitLab access token changed during the run.',
  run_inactive: 'The run was no longer active.',
  policy_document_too_large:
    'The rules document is over 64 KiB. The review did not run; make the document smaller.',
  policy_document_decode_error: 'The rules document must be valid UTF-8. Fix the encoding.',
  policy_document_control_character:
    'The rules document has a control character that is not allowed.',
  policy_document_type_unsupported: 'The rules document must be a regular file in Git.',
  policy_ignore_block_duplicate: '.review/rules.md may have only one review-ignore block.',
  policy_ignore_block_nested:
    'The review-ignore block must be at the top level of .review/rules.md.',
  policy_ignore_block_unclosed: 'The review-ignore block in .review/rules.md is not closed.',
  policy_ignore_info_invalid: 'review-ignore takes no extra parameters.',
  policy_ignore_pattern_invalid: 'The review-ignore block has a mask that is not allowed.',
  policy_ignore_limit_exceeded:
    'The review-ignore block has too many masks, or a mask is too long.',
  policy_path_invalid: 'The changes have a file path that is not allowed.',
  policy_match_budget_exceeded:
    'The review-ignore masks are too costly to check. Simplify the rules.',
  policy_prompt_budget_exceeded: 'The rules documents do not fit in the model context in full.',
  policy_access_denied: 'No access to the rules documents of the repository.',
  policy_revision_unavailable: 'The pinned rules revision is unavailable.',
  policy_fetch_transient: 'Could not read the rules documents from GitHub.',
  policy_rate_limited: 'GitHub limited the request rate while reading the rules.',
  policy_snapshot_integrity_error: 'The rules snapshot of the run is damaged or inconsistent.',
  policy_context_violation: 'A forbidden source got into the model context.',
  unknown: 'Unknown reason: {{code}}',
}
