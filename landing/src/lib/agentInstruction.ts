/** Build the single prompt shown on the landing only for a usable GitHub App slug. */
export function buildAgentInstruction(appSlug: unknown, appUrl: string): string | null {
  if (typeof appSlug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(appSlug)) {
    return null
  }

  const installUrl = `https://github.com/apps/${appSlug}/installations/new`
  const guideUrl = new URL('/api/agent/instructions', appUrl).href
  return `Connect AI Code Reviewer to this GitHub repository. If needed, ask me to install its GitHub App at ${installUrl}. Then read and follow ${guideUrl}. Ask me to approve GitHub access, confirm the review settings, and select a test PR for the first review.`
}
