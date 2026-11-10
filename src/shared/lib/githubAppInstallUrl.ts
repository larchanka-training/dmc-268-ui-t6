export function githubAppInstallUrl(slug: string): string | undefined {
  return slug ? `https://github.com/apps/${slug}/installations/new` : undefined
}
