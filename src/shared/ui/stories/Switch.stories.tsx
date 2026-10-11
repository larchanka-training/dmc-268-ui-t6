import type { Meta, StoryObj } from '@storybook/react-vite'
import { Switch } from 'antd'

const meta: Meta<typeof Switch> = {
  title: 'Ant Design/Switch',
  component: Switch,
}

export default meta
type Story = StoryObj<typeof Switch>

const row = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' } as const

export const Playground: Story = {
  render: () => <Switch aria-label="Ревью включено" defaultChecked />,
}

export const States: Story = {
  render: () => (
    <div style={row}>
      <Switch aria-label="Включено" defaultChecked />
      <Switch aria-label="Выключено" />
      <Switch aria-label="Недоступно, включено" defaultChecked disabled />
      <Switch aria-label="Недоступно, выключено" disabled />
      <Switch aria-label="Сохраняется" defaultChecked loading />
    </div>
  ),
}
