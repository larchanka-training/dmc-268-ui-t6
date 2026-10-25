import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

// The docs are served under the landing host at /docs (the edge proxy sends /docs and /docs/* to
// the docs container), so every page, asset and route lives under this prefix.
const basePath = '/docs'

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  devIndicators: false,
  // No generated AGENTS.md in docs-site.
  agentRules: false,
  basePath,
  // Static HTML in out/, served by nginx in the docs image (docs-site/Dockerfile).
  output: 'export',
  // Plain <iframe>, metadata icons and the search client do not add the base path themselves;
  // they read it from lib/shared.ts.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
}

export default withMDX(config)
