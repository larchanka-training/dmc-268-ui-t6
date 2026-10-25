'use client'

import { useEffect, useState, type ComponentType } from 'react'
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

/** Renders after mount only: Ant Design styles are injected on the client, so nothing flashes. */
export function MockScreen({ screen }: { screen: MockName }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])
  if (!ready) return null
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
