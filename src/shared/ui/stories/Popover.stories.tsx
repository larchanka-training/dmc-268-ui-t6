import type { Meta, StoryObj } from '@storybook/react-vite'

import { InfoHint } from '../InfoHint/InfoHint'

const meta: Meta<typeof InfoHint> = {
  title: 'Ant Design/Popover',
  component: InfoHint,
}

export default meta
type Story = StoryObj<typeof InfoHint>

export const Explanation: Story = {
  args: {
    label: 'Подробнее о RAG',
    children: 'Индекс хранит только структуру кода, не его текст.',
  },
  render: (args) => (
    <div style={{ alignItems: 'center', display: 'flex', gap: 4, padding: 48 }}>
      <span>RAG учитывает связи между файлами.</span>
      <InfoHint {...args} />
    </div>
  ),
}

export const NarrowViewport: Story = {
  args: {
    label: 'Подробнее о RAG',
    children:
      'RAG учитывает связи между файлами репозитория, делая ревью точнее. Может увеличить стоимость. Хранится только структура кода, не его текст.',
  },
  render: (args) => (
    <div style={{ alignItems: 'center', display: 'flex', gap: 4, maxWidth: 320, padding: 16 }}>
      <span>Ревью может стоить дороже.</span>
      <InfoHint {...args} />
    </div>
  ),
}

export const OpenWithKeyboard: Story = {
  ...Explanation,
  play: ({ canvasElement }) => {
    const button = canvasElement.querySelector('button')
    button?.focus()
    button?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
  },
}
