import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from 'antd'

import { Tag } from '../Tag/Tag'
import { RowButton } from './RowButton'

const meta: Meta<typeof RowButton> = {
  title: 'Свои компоненты/RowButton',
  component: RowButton,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof RowButton>

/** The header of a collapsed review comment. A long title wraps instead of being cut. */
export const CommentHeader: Story = {
  render: () => (
    <RowButton>
      <Tag tone="warning">warning</Tag>
      <strong>Проверка прав выполняется после чтения данных, а не до него</strong>
      <span style={{ color: 'var(--rv-text-2)' }}>строки 12-18</span>
    </RowButton>
  ),
}

/** The user row at the bottom of the sidebar. */
export const UserRow: Story = {
  render: () => (
    <div style={{ width: 208 }}>
      <RowButton aria-label="Меню пользователя" size="large">
        <Avatar size={28}>C</Avatar>
        <strong>createunix</strong>
      </RowButton>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => <RowButton disabled>Недоступная строка</RowButton>,
}
