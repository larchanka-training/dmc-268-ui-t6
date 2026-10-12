import { StopOutlined } from '@ant-design/icons'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Steps } from 'antd'

const meta: Meta<typeof Steps> = {
  title: 'Ant Design/Steps',
  component: Steps,
}

export default meta
type Story = StoryObj<typeof Steps>

const TITLES = ['Сбор контекста', 'Анализ LLM', 'Публикация'] as const

/** Stages of a run in progress: one finished, one in work, one waiting. */
export const Running: Story = {
  render: () => (
    <Steps
      current={1}
      items={[
        { title: TITLES[0], status: 'finish' },
        { title: TITLES[1], status: 'process' },
        { title: TITLES[2], status: 'wait' },
      ]}
      size="small"
    />
  ),
}

/** Nothing has started: every stage waits and none is current. */
export const Waiting: Story = {
  render: () => (
    <Steps
      current={3}
      items={TITLES.map((title) => ({ title, status: 'wait' as const }))}
      size="small"
    />
  ),
}

export const Finished: Story = {
  render: () => (
    <Steps
      current={3}
      items={TITLES.map((title) => ({ title, status: 'finish' as const }))}
      size="small"
    />
  ),
}

/** A failed stage carries the error code under its title. */
export const Failed: Story = {
  render: () => (
    <Steps
      current={1}
      items={[
        { title: TITLES[0], status: 'finish' },
        { title: TITLES[1], status: 'error', content: 'llm_timeout' },
        { title: TITLES[2], status: 'wait' },
      ]}
      size="small"
    />
  ),
}

/**
 * A cancelled run: nothing broke, so the stage is not red. It is a waiting stage with a stop icon;
 * the screen that shows it gives the icon the warning colour.
 */
export const Cancelled: Story = {
  render: () => (
    <Steps
      current={1}
      items={[
        { title: TITLES[0], status: 'finish' },
        {
          title: TITLES[1],
          status: 'wait',
          icon: <StopOutlined style={{ color: 'var(--rv-warning)' }} />,
          content: 'Остановлено',
        },
        { title: TITLES[2], status: 'wait' },
      ]}
      size="small"
    />
  ),
}
