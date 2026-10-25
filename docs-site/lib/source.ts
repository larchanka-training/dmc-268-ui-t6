import { loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'
import { defineDocs } from 'fumadocs-mdx/macro'
import { applyMdxPreset } from 'fumadocs-mdx/config'
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema'
import { docsRoute } from './shared'

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    // Search indexes headings and prose only: table rows made cut-off, context-free hits.
    mdxOptions: applyMdxPreset({
      remarkStructureOptions: { types: ['heading', 'paragraph', 'blockquote'] },
    }),
  },
  meta: { schema: metaSchema },
})

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
})
