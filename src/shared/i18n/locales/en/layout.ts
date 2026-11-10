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
  notFound: {
    title: 'Page not found',
    description:
      'There is no such address in the dashboard. Check the link or open the list of repositories.',
    toRepositories: 'Go to repositories',
  },
  routeOffline: 'No network connection. The page will open once you are back online',
}
