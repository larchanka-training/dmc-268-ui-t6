import type { Meta, StoryObj } from '@storybook/react-vite'
import { SearchOutlined } from '@ant-design/icons'
import { Input, InputNumber } from 'antd'

const meta: Meta<typeof Input> = {
  title: 'Ant Design/Input',
  component: Input,
  args: { placeholder: 'Поиск по названию' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Input>

const stack = { display: 'grid', gap: 16, maxWidth: 420 } as const

export const Playground: Story = {}

export const Kinds: Story = {
  render: () => (
    <div style={stack}>
      <Input allowClear placeholder="Поиск по названию..." prefix={<SearchOutlined />} />
      <Input defaultValue="dmc-268-ui-t6" />
      <InputNumber defaultValue={10} max={10} min={1} style={{ width: '100%' }} />
      <Input.TextArea
        defaultValue="Не трогай миграции. Ругайся на any и на console.log в проде."
        rows={3}
      />
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div style={stack}>
      <Input defaultValue="14" status="error" />
      <Input defaultValue="larchanka-training/dmc-268-api-t6" disabled />
    </div>
  ),
}

export const DisabledNumber: Story = {
  render: () => (
    <div style={stack}>
      <label htmlFor="disabled-findings-limit">Лимит замечаний</label>
      <InputNumber
        defaultValue={10}
        disabled
        id="disabled-findings-limit"
        max={10}
        min={1}
        style={{ width: '100%' }}
      />
    </div>
  ),
}

export const StatusFocus: Story = {
  render: () => (
    <div style={stack}>
      <label htmlFor="error-review-rule">Правило: ошибка</label>
      <Input defaultValue="14" id="error-review-rule" status="error" />
      <label htmlFor="warning-review-rule">Правило: предупреждение</label>
      <Input defaultValue="Проверьте правило" id="warning-review-rule" status="warning" />
      <label htmlFor="error-findings-limit">Лимит: ошибка</label>
      <InputNumber defaultValue={14} id="error-findings-limit" status="error" />
      <label htmlFor="warning-findings-limit">Лимит: предупреждение</label>
      <InputNumber defaultValue={10} id="warning-findings-limit" status="warning" />
    </div>
  ),
}
