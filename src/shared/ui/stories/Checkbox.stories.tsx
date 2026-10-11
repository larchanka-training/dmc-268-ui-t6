import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox, Radio } from 'antd'

const meta: Meta<typeof Checkbox> = {
  title: 'Ant Design/Checkbox',
  component: Checkbox,
}

export default meta
type Story = StoryObj<typeof Checkbox>

const row = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' } as const

export const Checkboxes: Story = {
  render: () => (
    <div style={row}>
      <Checkbox defaultChecked>Критичные</Checkbox>
      <Checkbox>Low</Checkbox>
      <Checkbox defaultChecked disabled>
        Недоступен
      </Checkbox>
    </div>
  ),
}

export const Radios: Story = {
  render: () => (
    <Radio.Group
      defaultValue="COMMENT"
      options={[
        { value: 'COMMENT', label: 'Комментарий' },
        { value: 'REQUEST_CHANGES', label: 'Запрос изменений' },
      ]}
    />
  ),
}
