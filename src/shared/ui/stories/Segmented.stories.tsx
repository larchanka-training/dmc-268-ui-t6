import type { Meta, StoryObj } from '@storybook/react-vite'
import { Segmented } from 'antd'

const meta: Meta<typeof Segmented> = {
  title: 'Ant Design/Segmented',
  component: Segmented,
}

export default meta
type Story = StoryObj<typeof Segmented>

const row = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' } as const

/** Two to four views of the same data. For a longer list use `Select`. */
export const Filter: Story = {
  render: () => (
    <Segmented
      defaultValue="all"
      options={[
        { value: 'all', label: 'Все (12)' },
        { value: 'active', label: 'Активные (7)' },
        { value: 'paused', label: 'На паузе (5)' },
      ]}
    />
  ),
}

export const Small: Story = {
  render: () => (
    <div style={row}>
      <Segmented
        defaultValue="unified"
        options={[
          { value: 'unified', label: 'Unified' },
          { value: 'split', label: 'Split' },
        ]}
        size="small"
      />
    </div>
  ),
}
