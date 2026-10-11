import type { Meta, StoryObj } from '@storybook/react-vite'

import { Logo } from './Logo'

const meta: Meta<typeof Logo> = {
  title: 'Свои компоненты/Logo',
  component: Logo,
}

export default meta
type Story = StoryObj<typeof Logo>

export const Playground: Story = { args: { size: 40, title: 'Reviewer' } }

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Logo size={16} />
      <Logo size={24} />
      <Logo size={40} />
      <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', fontWeight: 600 }}>
        <Logo size={20} />
        Reviewer
      </span>
    </div>
  ),
}
