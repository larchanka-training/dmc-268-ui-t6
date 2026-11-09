/** The sidebar, the profile menu and the app-wide error screen. */
export const layout = {
  nav: {
    label: 'Sections',
    repositories: 'Repositories',
    runs: 'Runs',
    audit: 'Audit',
    analytics: 'Analytics',
    playground: 'Playground',
    review: 'Review',
  },
  expandMenu: 'Expand menu',
  collapseMenu: 'Collapse menu',
  theme: {
    title: 'Theme',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  },
  docs: 'Documentation',
  workspace: {
    title: 'Workspace',
    current: 'Workspace: {{name}}',
    installation: 'Installation ID: {{id}}',
  },
  userMenu: {
    label: 'User menu',
    fallbackLogin: 'User',
    logout: 'Sign out',
    agentTokens: {
      title: 'Agent tokens',
      empty: 'No active agent tokens',
      expires: 'Expires {{date}}',
      revoke: 'Revoke',
      confirm: 'Revoke this agent token?',
      cancel: 'Cancel',
      loadError: 'Could not load agent tokens',
      revokeError: 'Could not revoke the agent token',
      retry: 'Retry',
    },
  },
  routeError: {
    title: 'Something went wrong',
    fallbackMessage: 'Unexpected application error',
    backToDashboard: 'Back to the dashboard',
  },
  rootError: {
    title: 'Something went wrong',
    description: 'The app stopped because of an error. Reload the page to continue.',
    reload: 'Reload',
  },
  routeOffline: 'No network connection. The page will open once you are back online',
}
