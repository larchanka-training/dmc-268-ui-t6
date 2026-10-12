import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, List, Result, Typography } from 'antd'

const meta: Meta<typeof Typography> = {
  title: 'Ant Design/Content',
  component: Typography,
}

export default meta
type Story = StoryObj<typeof Typography>

/** Text roles. Sizes and weights are the ones of the specification, §4. */
export const Text: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Заголовок блока
      </Typography.Title>
      <Typography.Text>Основной текст страницы</Typography.Text>
      <Typography.Text strong>Выделенный текст</Typography.Text>
      <Typography.Text type="secondary">Вторичный текст</Typography.Text>
      <Typography.Text type="success">Успех</Typography.Text>
      <Typography.Text type="warning">Предупреждение</Typography.Text>
      <Typography.Text type="danger">Не удалось загрузить ответ</Typography.Text>
      <Typography.Text disabled>Недоступно</Typography.Text>
      <Typography.Text code>src/shared/ui/theme/buildTheme.ts</Typography.Text>
      <Typography.Link href="https://github.com">Ссылка</Typography.Link>
      <Typography.Paragraph style={{ margin: 0 }}>
        Абзац: модель предлагает заменить проверку на раннее возвращение, чтобы убрать вложенность.
      </Typography.Paragraph>
    </div>
  ),
}

export const SimpleList: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <List
        bordered
        dataSource={['src/app/App.tsx', 'src/main.tsx', 'README.md']}
        renderItem={(item) => <List.Item>{item}</List.Item>}
        size="small"
      />
    </div>
  ),
}

/** A whole-page outcome: an error of sign-in, a page that does not exist. */
export const PageResult: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <Result
        extra={<Button type="primary">Войти заново</Button>}
        status="error"
        subTitle="GitHub не подтвердил вход. Попробуйте ещё раз."
        title="Не удалось войти"
      />
      <Result extra={<Button>На главную</Button>} status="404" title="Страница не найдена" />
    </div>
  ),
}
