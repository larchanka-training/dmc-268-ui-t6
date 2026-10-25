import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  devIndicators: false,
  // No generated AGENTS.md in docs-site.
  agentRules: false,
  // The docs open straight on the Introduction.
  async redirects() {
    return [{ source: '/', destination: '/docs', permanent: false }]
  },
  // The mockup pages only feed the screenshots script: keep them out of search.
  async headers() {
    return [
      {
        source: '/mockups/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}

export default withMDX(config)
