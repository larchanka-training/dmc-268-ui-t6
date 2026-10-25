import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  devIndicators: false,
  // No generated AGENTS.md in docs-site.
  agentRules: false,
  // The docs open straight on the Introduction; /home-6 to /home-14 stay for comparison.
  async redirects() {
    return [{ source: '/', destination: '/docs', permanent: false }]
  },
}

export default withMDX(config)
