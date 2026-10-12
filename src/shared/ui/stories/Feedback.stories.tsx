import type { Meta, StoryObj } from '@storybook/react-vite'
import { Alert, Button, Empty, message, Skeleton, Spin, Tooltip } from 'antd'

const meta: Meta<typeof Alert> = {
  title: 'Ant Design/Feedback',
  component: Alert,
}

export default meta
type Story = StoryObj<typeof Alert>

const row = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' } as const

export const Alerts: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <Alert
        description="После установки GitHub App нажмите «Обновить доступ». Задержка до пары минут."
        showIcon
        title="Репозиторий появится не сразу"
        type="info"
      />
      <Alert showIcon title="Настройки сохранены" type="success" />
      <Alert
        description="Показаны первые 40 файлов из 112."
        showIcon
        title="Дифф слишком большой"
        type="warning"
      />
      <Alert
        action={<Button size="small">Повторить</Button>}
        description="Не удалось загрузить список прогонов."
        showIcon
        title="Ошибка загрузки"
        type="error"
      />
    </div>
  ),
}

export const Loading: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, maxWidth: 360 }}>
      <div style={row}>
        <Spin size="small" />
        <Spin />
        <Spin size="large" />
      </div>
      <Skeleton active paragraph={{ rows: 3 }} />
    </div>
  ),
}

/** An empty state says what to do next and offers the action. */
export const EmptyState: Story = {
  render: () => (
    <Empty
      description="Нет прогонов ревью. Поставьте метку ai-review на pull request."
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    >
      <Button type="primary">Установить GitHub App</Button>
    </Empty>
  ),
}

export const Hint: Story = {
  render: () => (
    <div style={{ padding: '40px 0' }}>
      <Tooltip title="Откроется GitHub, затем вы вернётесь сюда">
        <Button>Обновить доступ</Button>
      </Tooltip>
    </div>
  ),
}

/** A short confirmation of an action. It disappears on its own, so it never carries an error
 * the user has to act on: that is the job of `Alert`. */
export const Message: Story = {
  render: function MessageStory() {
    const [api, contextHolder] = message.useMessage()
    return (
      <div style={row}>
        {contextHolder}
        <Button
          onClick={() => {
            void api.success('Прогон перезапущен')
          }}
        >
          Успех
        </Button>
        <Button
          onClick={() => {
            void api.error('Не удалось перезапустить прогон')
          }}
        >
          Ошибка
        </Button>
        <Button
          onClick={() => {
            void api.loading('Отменяем прогон')
          }}
        >
          Загрузка
        </Button>
      </div>
    )
  },
}
