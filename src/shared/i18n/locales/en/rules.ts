/** The review rules block of the repository settings page. */
export const rules = {
  title: 'Review rules',
  loadFailed: 'Could not load the rules status',
  retry: 'Retry',
  missing: 'The default rules are in use, create .review/rules.md',
  defaultsVersion: 'Default rules version: {{version}}',
  fileFound: 'File found',
  fileText: 'File text',
  fileTextLabel: 'Rules file text',
  fileTextUnavailable: 'The file text is unavailable',
  fileEmpty: 'The file is empty',
  ignoredPaths: 'Ignored paths',
  noMasks: 'No masks',
  diagnostics: 'Diagnostics',
  checking: 'Checking .review/rules.md on the branch {{branch}}…',
  checked: 'Checked: {{date}}',
  invalid: 'The rules file has errors',
  unavailable: 'Could not read the rules file',
  limit: 'allowed {{limit}}, actual {{actual}}',
  limitLowerBound: 'allowed {{limit}}, actual more than {{actual}}',
  mask: 'mask',
  // A diagnostic text that differs from the run text of its code (reasons.*): no run here.
  statusTexts: {
    policy_document_too_large:
      'The rules document is over 64 KiB. A review will not run with it; make the document smaller.',
  },
  reasons: {
    policy_access_denied: 'The GitHub App has no access to the repository',
    policy_revision_unavailable:
      'The default branch revision is unavailable: GitHub did not confirm whether the rules file exists.',
    policy_fetch_transient: 'GitHub is temporarily not responding',
    policy_rate_limited: 'GitHub limited the number of requests',
    fallback: 'The server could not read the rules file',
  },
  providerReasons: {
    policy_access_denied: '{{accessName}} has no access to the repository',
    policy_revision_unavailable:
      'The default branch revision is unavailable: {{name}} did not confirm whether the rules file exists.',
    policy_fetch_transient: '{{name}} is temporarily not responding',
    policy_rate_limited: '{{accessName}} limited the number of requests',
  },
}
