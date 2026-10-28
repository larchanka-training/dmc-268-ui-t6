// The same reset the app loads in `main.tsx`, so a story shows focus exactly as a screen does.
import 'antd/dist/reset.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './preview.css'

import { DocsContainer, type DocsContainerProps } from '@storybook/addon-docs/blocks'
import type { Decorator, Preview } from '@storybook/react-vite'
import { useEffect, useState, type JSX, type PropsWithChildren } from 'react'
import { GLOBALS_UPDATED } from 'storybook/internal/core-events'
import { addons } from 'storybook/preview-api'
import { themes } from 'storybook/theming'
import { z } from 'zod'

import { DesignSystemProvider } from '../src/shared/ui'

// Every story renders inside the provider, the same way the app does: what you see here is what
// a screen gets.
const withDesignSystem: Decorator = (Story, context) => {
  const mode = context.globals.theme === 'light' ? 'light' : 'dark'
  const fullscreen = context.parameters.layout === 'fullscreen'
  return (
    <DesignSystemProvider language="en" mode={mode}>
      <div
        style={{
          minHeight: fullscreen ? '100vh' : undefined,
          padding: fullscreen ? 0 : 24,
          background: 'var(--rv-bg)',
          color: 'var(--rv-text)',
          fontFamily: 'var(--rv-font-sans)',
          fontSize: 'var(--rv-fs)',
        }}
      >
        <Story />
      </div>
    </DesignSystemProvider>
  )
}

type Mode = 'dark' | 'light'

const globalsUpdatedSchema = z.object({ globals: z.object({ theme: z.enum(['dark', 'light']) }) })
const cachedGlobalsSchema = z.tuple([globalsUpdatedSchema])

function modeFromUrl(): Mode {
  const globals = new URLSearchParams(window.location.search).get('globals') ?? ''
  return globals.includes('theme:light') ? 'light' : 'dark'
}

function currentMode(): Mode {
  // The channel survives docs → story → docs. The iframe URL may still contain an older theme.
  const cached = cachedGlobalsSchema.safeParse(addons.getChannel().last(GLOBALS_UPDATED))
  return cached.success ? cached.data[0].globals.theme : modeFromUrl()
}

// Documentation pages (the specification) have no story around them, so the decorator above does
// not run there. This container gives them the same theme switch from the toolbar.
function ThemedDocsContainer(props: PropsWithChildren<DocsContainerProps>): JSX.Element {
  const [mode, setMode] = useState<Mode>(currentMode)
  useEffect(() => {
    const channel = addons.getChannel()
    const onGlobals = (event: unknown): void => {
      const parsed = globalsUpdatedSchema.safeParse(event)
      if (parsed.success) setMode(parsed.data.globals.theme)
    }
    channel.on(GLOBALS_UPDATED, onGlobals)
    return () => {
      channel.off(GLOBALS_UPDATED, onGlobals)
    }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.rvTheme = mode
  }, [mode])
  return <DocsContainer {...props} theme={mode === 'light' ? themes.light : themes.dark} />
}

const preview: Preview = {
  decorators: [withDesignSystem],
  globalTypes: {
    theme: {
      description: 'Тема',
      toolbar: {
        title: 'Тема',
        icon: 'contrast',
        items: [
          { value: 'dark', title: 'Тёмная' },
          { value: 'light', title: 'Светлая' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  parameters: {
    layout: 'padded',
    docs: { container: ThemedDocsContainer },
    options: {
      storySort: {
        order: ['Reviewer UI', 'Спецификация', 'Свои компоненты', 'Ant Design'],
      },
    },
  },
}

export default preview
