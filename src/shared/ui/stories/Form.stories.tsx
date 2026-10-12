import { SearchOutlined } from '@ant-design/icons'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, Form, Input, Select } from 'antd'

const meta: Meta<typeof Form> = {
  title: 'Ant Design/Form',
  component: Form,
}

export default meta
type Story = StoryObj<typeof Form>

const levels = [
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
]

/**
 * A row of filters. From 576 px up each label stays beside its control and only the control
 * narrows; below that the label goes above a full-width control (`styles/antd.css`).
 */
export const Inline: Story = {
  render: () => (
    <Form layout="inline">
      <Form.Item htmlFor="story-form-levels" label="Критичность">
        <Select
          allowClear
          defaultValue={['critical', 'warning']}
          id="story-form-levels"
          maxTagCount="responsive"
          mode="multiple"
          options={levels}
          placeholder="Все уровни"
          style={{ width: 200 }}
        />
      </Form.Item>
      <Form.Item htmlFor="story-form-search" label="Поиск">
        <Input
          allowClear
          id="story-form-search"
          placeholder="Текст, правило"
          prefix={<SearchOutlined />}
          style={{ width: 200 }}
        />
      </Form.Item>
      <Form.Item>
        <Button>Сбросить фильтры</Button>
      </Form.Item>
    </Form>
  ),
}
