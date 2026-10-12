import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, Form, InputNumber, Modal, Select, Switch } from 'antd'
import { useState } from 'react'

const meta: Meta<typeof Modal> = {
  title: 'Ant Design/Modal',
  component: Modal,
}

export default meta
type Story = StoryObj<typeof Modal>

/** Width 520 px. Secondary button first, the primary action last. */
export const Settings: Story = {
  render: function SettingsModal() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true)
          }}
        >
          Настроить
        </Button>
        <Modal
          cancelText="Отмена"
          okText="Сохранить"
          onCancel={() => {
            setOpen(false)
          }}
          onOk={() => {
            setOpen(false)
          }}
          open={open}
          title="Настройки репозитория larchanka-training/dmc-268-ui-t6"
          width={520}
        >
          <Form
            initialValues={{ enabled: true, waitForCi: 'auto', maxComments: 10 }}
            layout="vertical"
          >
            <Form.Item label="Активность ревью" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Ожидание CI" name="waitForCi" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'auto', label: 'Авто (ожидать CI при наличии проверок)' },
                  { value: 'always', label: 'Всегда (всегда ждать успешного CI)' },
                ]}
              />
            </Form.Item>
            <Form.Item
              label="Лимит замечаний (1..10)"
              name="maxComments"
              rules={[{ required: true }]}
            >
              <InputNumber max={10} min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      </>
    )
  },
}

/** While saving, the primary button shows the ring and the window stays open. A field error
 * is shown under its field. */
export const SavingWithError: Story = {
  render: function SavingModal() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true)
          }}
        >
          Открыть
        </Button>
        <Modal
          cancelText="Отмена"
          confirmLoading
          okText="Сохранить"
          onCancel={() => {
            setOpen(false)
          }}
          open={open}
          title="Настройки репозитория"
          width={520}
        >
          <Form layout="vertical">
            <Form.Item
              help="Укажите число от 1 до 10"
              label="Лимит замечаний (1..10)"
              validateStatus="error"
            >
              <InputNumber defaultValue={42} status="error" style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      </>
    )
  },
}
