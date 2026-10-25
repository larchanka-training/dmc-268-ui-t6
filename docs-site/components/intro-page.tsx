import { notFound } from 'next/navigation'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import { source } from '@/lib/source'
import { getMDXComponents } from './mdx'
import { IntroHero } from './intro-hero'
import heroStyles from './intro-hero.module.css'

/**
 * The Introduction page (content/docs/index.mdx) for the comparison routes /intro-glass and
 * /intro-plain. Same MDX source as /docs, so the text cannot drift.
 */
export function IntroPage({ glass }: { glass: boolean }) {
  const page = source.getPage([])
  if (!page) notFound()
  const MDX = page.data.body
  const heading = (
    <>
      <DocsTitle className={glass ? heroStyles.title : undefined}>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
    </>
  )
  return (
    <DocsPage toc={page.data.toc}>
      {glass ? <IntroHero>{heading}</IntroHero> : heading}
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  )
}
