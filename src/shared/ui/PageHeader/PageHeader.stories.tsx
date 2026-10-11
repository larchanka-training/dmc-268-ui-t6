import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from 'antd'

import { PageHeader } from './PageHeader'

const meta: Meta<typeof PageHeader> = {
  title: 'Свои компоненты/PageHeader',
  component: PageHeader,
  args: { title: 'Репозитории' },
}

export default meta
type Story = StoryObj<typeof PageHeader>

export const TitleOnly: Story = {}

export const WithActions: Story = {
  args: {
    description: 'Подключено: 3, ревью включено в 2',
    actions: (
      <>
        <Button icon={<ReloadOutlined />}>Обновить</Button>
        <Button>Обновить доступ</Button>
        <Button icon={<PlusOutlined />} type="primary">
          Подключить репозиторий
        </Button>
      </>
    ),
  },
}
