import { BranchesOutlined } from '@ant-design/icons'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Tag } from './Tag'

const meta: Meta<typeof Tag> = {
  title: 'Свои компоненты/Tag',
  component: Tag,
  args: { children: 'succeeded', tone: 'success' },
}

export default meta
type Story = StoryObj<typeof Tag>

const row = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } as const

export const Playground: Story = {}

/** Default look: a dot in a thin pill. Use it for anything that only reports a state. */
export const RunStatuses: Story = {
  render: () => (
    <div style={row}>
      <Tag>queued</Tag>
      <Tag pulse tone="info">
        running
      </Tag>
      <Tag pulse tone="info">
        publishing
      </Tag>
      <Tag tone="success">succeeded</Tag>
      <Tag tone="danger">failed</Tag>
      <Tag tone="warning">cancelled</Tag>
      <Tag>skipped</Tag>
    </div>
  ),
}

export const Severity: Story = {
  render: () => (
    <div style={row}>
      <Tag tone="critical" variant="solid">
        critical
      </Tag>
      <Tag tone="high">high</Tag>
      <Tag tone="warning">medium</Tag>
      <Tag>low</Tag>
      <Tag tone="info">info</Tag>
    </div>
  ),
}

/** Solid tags have no dot and are reserved for what needs action. One or two per screen. */
export const Solid: Story = {
  render: () => (
    <div style={row}>
      <Tag tone="critical" variant="solid">
        critical
      </Tag>
      <Tag tone="high" variant="solid">
        Запрос изменений
      </Tag>
      <Tag tone="danger" variant="solid">
        Blocking
      </Tag>
    </div>
  ),
}

/** Outline tags carry metadata: a branch, an engine, a mode. */
export const Outline: Story = {
  render: () => (
    <div style={row}>
      <Tag icon={<BranchesOutlined />} variant="outline">
        main
      </Tag>
      <Tag variant="outline">DiffEngine</Tag>
      <Tag variant="outline">summary-only</Tag>
    </div>
  ),
}
