import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select } from 'antd'

const meta: Meta<typeof Select> = {
  title: 'Ant Design/Select',
  component: Select,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, minHeight: 200 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Select>

const stack = { display: 'grid', gap: 16, maxWidth: 420 } as const

const options = [
  { value: 'auto', label: 'Авто (ожидать CI при наличии проверок)' },
  { value: 'always', label: 'Всегда (всегда ждать успешного CI)' },
  { value: 'never', label: 'Никогда (запускать ревью без ожидания CI)' },
]

export const Playground: Story = {
  render: () => <Select defaultValue="auto" options={options} style={{ width: '100%' }} />,
}

export const States: Story = {
  render: () => (
    <div style={stack}>
      <Select options={options} placeholder="Выберите" style={{ width: '100%' }} />
      <Select defaultValue="auto" options={options} status="error" style={{ width: '100%' }} />
      <Select defaultValue="auto" disabled options={options} style={{ width: '100%' }} />
    </div>
  ),
}
