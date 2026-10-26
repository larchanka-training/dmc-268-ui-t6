'use client'

import { useEffect, useSyncExternalStore, type ComponentType } from 'react'
import { RunsScreen } from './runs-screen'
import { RunDetailScreen } from './run-detail-screen'
import {
  AutoReviewBlock,
  BranchesSeverityBlock,
  RagBlock,
  ReviewOptionsBlock,
  RulesBlock,
} from './settings-blocks'
import { SnippetShell } from './snippet-shell'
import type { MockName, ScreenName, SnippetName } from './mock-names'

const SCREEN: Record<ScreenName, ComponentType> = {
  runs: RunsScreen,
  'run-detail': RunDetailScreen,
}

const SNIPPET: Record<SnippetName, ComponentType> = {
  'settings-auto-review': AutoReviewBlock,
  'settings-rag': RagBlock,
  'settings-review-options': ReviewOptionsBlock,
  'settings-branches-severity': BranchesSeverityBlock,
  'settings-rules': RulesBlock,
}

function isSnippet(name: MockName): name is SnippetName {
  return name in SNIPPET
}

const noSubscribe = () => () => undefined

/**
 * Renders on the client only: Ant Design styles are injected there, so nothing flashes. Once it
 * has rendered, `data-mock-ready` on <body> tells scripts/shoot-mockups.mjs the page is drawn.
 */
export function MockScreen({ screen }: { screen: MockName }) {
  const client = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  )
  useEffect(() => {
    if (client) document.body.dataset.mockReady = 'true'
  }, [client])
  if (!client) return null
  if (isSnippet(screen)) {
    const Snippet = SNIPPET[screen]
    return (
      <SnippetShell>
        <Snippet />
      </SnippetShell>
    )
  }
  const Screen = SCREEN[screen]
  return <Screen />
}
