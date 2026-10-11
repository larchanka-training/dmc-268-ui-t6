import type { Meta, StoryObj } from '@storybook/react-vite'
import { Spin } from 'antd'

import { Spinner } from './Spinner'

const meta: Meta<typeof Spinner> = {
  title: 'Свои компоненты/Spinner',
  component: Spinner,
}

export default meta
type Story = StoryObj<typeof Spinner>

const row = { display: 'flex', gap: 24, alignItems: 'center' } as const

export const Playground: Story = {}

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Spinner size="sm" />
      <Spinner />
      <Spinner size="lg" />
    </div>
  ),
}

/** Ant Design `Spin` shows the same ring: the provider replaces its default indicator. */
export const InsideAntSpin: Story = {
  render: () => (
    <div style={row}>
      <Spin size="small" />
      <Spin />
      <Spin size="large" />
    </div>
  ),
}
