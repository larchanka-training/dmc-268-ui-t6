import { source } from '@/lib/source'
import { createFromSource } from 'fumadocs-core/search/server'

// Static export: the search index is written once at build time (out/api/search) and searched in
// the browser (search type 'static' in app/(site)/layout.tsx).
export const revalidate = false

export const { staticGET: GET } = createFromSource(source)
