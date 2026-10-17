import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlusOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import { Button } from 'antd'

const meta: Meta<typeof Button> = {
  title: 'Ant Design/Button',
  component: Button,
  args: { children: 'Сохранить' },
}

export default meta
type Story = StoryObj<typeof Button>

const row = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' } as const

export const Playground: Story = { args: { type: 'primary' } }

/** One `primary` per view. The rest are default or `text`; `danger` only stops or deletes. */
export const Variants: Story = {
  render: () => (
    <div style={row}>
      <Button icon={<PlusOutlined />} type="primary">
        Подключить репозиторий
      </Button>
      <Button icon={<ReloadOutlined />}>Обновить</Button>
      <Button type="text">Отмена</Button>
      <Button danger>Остановить прогон</Button>
      <Button danger type="primary">
        Удалить репозиторий
      </Button>
      <Button danger type="text">
        Сбросить
      </Button>
    </div>
  ),
}

/** Heights are 40, 32 and 26 px. */
export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Button size="large" type="primary">
        Войти через GitHub
      </Button>
      <Button type="primary">Сохранить</Button>
      <Button size="small" type="primary">
        Применить
      </Button>
      <Button aria-label="Настройки" icon={<SettingOutlined />} />
      <Button aria-label="Настройки" icon={<SettingOutlined />} size="small" />
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div style={row}>
      <Button disabled type="primary">
        Недоступно
      </Button>
      <Button disabled>Недоступно</Button>
      <Button loading type="primary">
        Сохраняем
      </Button>
      <Button loading>Обновляем доступ</Button>
    </div>
  ),
}
