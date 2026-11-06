/** The sidebar, the profile menu and the app-wide error screen. */
export const layout = {
  nav: {
    label: 'Sections',
    repositories: 'Repositories',
    runs: 'Runs',
    audit: 'Audit',
    analytics: 'Analytics',
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
  },
  routeError: {
    title: 'Something went wrong',
    fallbackMessage: 'Unexpected application error',
    backToDashboard: 'Back to the dashboard',
  },
  routeOffline: 'No network connection. The page will open once you are back online',
}
