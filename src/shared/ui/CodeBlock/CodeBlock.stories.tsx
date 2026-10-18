import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from 'antd'

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

/** Chromium adds scroll containers to the Tab order only when they actually overflow. */
export const LongLine: Story = {
  args: { children: JSON.stringify({ log: 'Строка для горизонтальной прокрутки. '.repeat(20) }) },
  render: (args) => (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <Button>Перед кодом</Button>
      <div style={{ width: 320, maxWidth: '100%' }}>
        <CodeBlock {...args} />
      </div>
      <Button>После кода</Button>
    </div>
  ),
}
