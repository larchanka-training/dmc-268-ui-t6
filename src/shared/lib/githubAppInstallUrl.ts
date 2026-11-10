export function githubAppInstallUrl(slug: string): string | undefined {
  return slug ? `https://github.com/apps/${slug}/installations/new` : undefined
}

// ui#175 Part 2 CI evidence: an export nothing imports.
export const CI_EVIDENCE_UNUSED = 'dead'
