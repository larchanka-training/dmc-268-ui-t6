/** The rules playground: code, rules and a simulated review that changes nothing. */
export const playground = {
  title: 'Rules playground',
  description:
    'Edits to the rules here are not saved to the repository and do not affect pull request reviews. A simulation is paid from the daily budget of the workspace of the selected repository.',
  repository: 'Repository (pays)',
  rulesSource: 'Rules',
  fromRepository: 'From .review/rules.md of the repository',
  defaultsOnly: 'Only the default rules of the service',
  defaultsOnlyNote: 'Only the default rules of the service apply.',
  mode: 'Mode',
  modeCode: 'Code',
  modeDiff: 'Diff',
  fileName: 'File name',
  fileNamePlaceholder: 'src/app.py',
  code: 'Code',
  rulesText: 'Rules text',
  result: 'Simulation result',
  resultEmpty: 'The findings of a simulation appear here.',
  repositoriesFailed: 'Could not load the repositories',
  retry: 'Retry',
  empty: 'No connected repositories. Connect a repository to try rules on it.',
  goToRepositories: 'Go to repositories',
}
