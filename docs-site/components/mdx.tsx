import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import type { MDXComponents } from 'mdx/types'
import { RepositorySettingsMock } from './mockups/repository-settings'
import { RunsListMock } from './mockups/runs-list'
import { RunDetailMock } from './mockups/run-detail'
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
    RepositorySettingsMock,
    RunsListMock,
    RunDetailMock,
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
