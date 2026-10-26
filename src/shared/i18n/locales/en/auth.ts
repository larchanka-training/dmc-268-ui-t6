/** The sign-in page, the GitHub callback page and their errors. */
export const auth = {
  login: {
    title: 'Sign in to Reviewer',
    subtitle: 'AI code review for your pull requests',
    alreadySignedIn: 'You are already signed in as {{login}}',
    fallbackLogin: 'user',
    goToDashboard: 'Go to the dashboard',
    note: 'You sign in through the GitHub App of the reviewer bot',
  },
  button: {
    github: 'Sign in with GitHub',
    notConfigured: 'Sign-in is not configured (VITE_GITHUB_CLIENT_ID)',
    demoLabel: 'Sign in as the demo user',
    demo: 'Demo sign-in (Mock)',
  },
  callback: {
    loadingTitle: 'Signing in with GitHub...',
    loadingText: 'Exchanging the confirmation code for a session token',
    failedTitle: 'Could not sign in',
    backToLogin: 'Back to sign-in',
    missingCode: 'The authorization code is missing (no code parameter)',
    failed: 'Could not complete the sign-in',
  },
  errors: {
    signInFailed: 'Could not sign in with GitHub',
    signInFailedWithCode: 'Could not sign in with GitHub (code {{status}})',
    invalidGrant: 'The authorization code is invalid or has expired',
    unauthorizedClient: 'The OAuth client is not authorized',
    accessDenied: 'Access denied',
    invalidGithubCode: 'Invalid GitHub authorization code',
    githubUnavailable: 'Sign-in with GitHub is temporarily unavailable',
    invalidState: 'Invalid security parameter state (CSRF protection)',
    oauthAccessDenied: 'Access was denied by the user on GitHub',
    oauthRedirectUriMismatch: 'Wrong redirect URI of the GitHub app',
    oauthInvalidScope: 'Invalid OAuth permissions were requested',
  },
}
