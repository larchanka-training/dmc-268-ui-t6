import type { Meta, StoryObj } from '@storybook/react-vite'

import { CodeBlock } from './CodeBlock'

const meta: Meta<typeof CodeBlock> = {
  title: 'Свои компоненты/CodeBlock',
  component: CodeBlock,
  args: {
    children: JSON.stringify(
      { owner: 'larchanka-training', repo: 'dmc-268-ui-t6', pull: 34 },
      null,
      2,
    ),
  },
}

export default meta
type Story = StoryObj<typeof CodeBlock>

export const Default: Story = {}
