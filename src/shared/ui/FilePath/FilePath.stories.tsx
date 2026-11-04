import type { Meta, StoryObj } from '@storybook/react-vite'

import { FilePath } from './FilePath'

const meta: Meta<typeof FilePath> = {
  title: 'Свои компоненты/FilePath',
  component: FilePath,
}

export default meta
type Story = StoryObj<typeof FilePath>

export const Short: Story = {
  args: { path: 'package.json' },
}

/** A long path wraps inside a narrow column: it is neither cut nor pushes the page wider. */
export const LongInNarrowColumn: Story = {
  args: {
    path: 'src/widgets/diff-viewer/ui/components/a-very-long-file-name-without-any-spaces.test.tsx',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 240 }}>
        <Story />
      </div>
    ),
  ],
}
