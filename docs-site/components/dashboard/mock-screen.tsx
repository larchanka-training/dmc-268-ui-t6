'use client'

import { useEffect, useState } from 'react'
import { SettingsScreen } from './settings-screen'
import { RunsScreen } from './runs-screen'
import { RunDetailScreen } from './run-detail-screen'

const SCREEN = { settings: SettingsScreen, runs: RunsScreen, 'run-detail': RunDetailScreen }

/** Renders after mount only: Ant Design styles are injected on the client, so nothing flashes. */
export function MockScreen({ screen }: { screen: keyof typeof SCREEN }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])
  const Screen = SCREEN[screen]
  return ready ? <Screen /> : null
}
