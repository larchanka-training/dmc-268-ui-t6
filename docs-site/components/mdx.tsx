import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import type { MDXComponents } from 'mdx/types'
import {
  AutoReviewSnippet,
  BranchesSeveritySnippet,
  RagSnippet,
  ReviewOptionsSnippet,
  RulesSnippet,
  RunDetailMock,
  RunsListMock,
} from './mockups'
import { Flow } from './flow'
import { AppLink } from './app-link'
import { StatusBadge } from './status-badge'
import { StartHere } from './start-here'

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Step,
    Steps,
    Tab,
    Tabs,
    Accordion,
    Accordions,
    RunsListMock,
    RunDetailMock,
    AutoReviewSnippet,
    RagSnippet,
    ReviewOptionsSnippet,
    BranchesSeveritySnippet,
    RulesSnippet,
    Flow,
    AppLink,
    StatusBadge,
    StartHere,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
