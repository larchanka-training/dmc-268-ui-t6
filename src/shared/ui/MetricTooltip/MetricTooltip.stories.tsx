import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from 'antd'

import { MetricTooltip } from './MetricTooltip'

const meta: Meta<typeof MetricTooltip> = {
  title: 'Свои компоненты/MetricTooltip',
  component: MetricTooltip,
  decorators: [
    (Story) => (
      <div style={{ padding: 48, display: 'flex', gap: 16 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof MetricTooltip>

export const Default: Story = {
  render: () => (
    <MetricTooltip title="Число успешных прогонов за выбранный период">
      <Button>Наведите или сфокусируйте (Esc закрывает)</Button>
    </MetricTooltip>
  ),
}

export const MetricValue: Story = {
  render: () => (
    <MetricTooltip title="Число критических находок (дают вердикт «Блокирующие») за выбранный период">
      <span tabIndex={0}>42</span>
    </MetricTooltip>
  ),
}
