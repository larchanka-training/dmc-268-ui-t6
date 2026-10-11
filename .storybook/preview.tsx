import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './preview.css'

import type { Decorator, Preview } from '@storybook/react-vite'
import { themes } from 'storybook/theming'

import { DesignSystemProvider } from '../src/shared/ui'

// Every story renders inside the provider, the same way the app does: what you see here is what
// a screen gets.
const withDesignSystem: Decorator = (Story, context) => {
  const mode = context.globals.theme === 'light' ? 'light' : 'dark'
  const fullscreen = context.parameters.layout === 'fullscreen'
  return (
    <DesignSystemProvider mode={mode}>
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
    docs: { theme: themes.dark },
    options: {
      storySort: {
        order: ['Reviewer UI', 'Спецификация', 'Свои компоненты', 'Ant Design'],
      },
    },
  },
}

export default preview
