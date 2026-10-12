import type { Meta, StoryObj } from '@storybook/react-vite'

import { ProgressSteps, type ProgressStep } from './ProgressSteps'

const meta: Meta<typeof ProgressSteps> = {
  title: 'Свои компоненты/ProgressSteps',
  component: ProgressSteps,
}

export default meta
type Story = StoryObj<typeof ProgressSteps>

const [CONTEXT, ANALYSIS, PUBLISHING] = [
  { key: 'context', title: 'Сбор контекста' },
  { key: 'analysis', title: 'Анализ LLM' },
  { key: 'publishing', title: 'Публикация' },
] as const

function steps(...states: [ProgressStep['state'], ProgressStep['state'], ProgressStep['state']]) {
  return [CONTEXT, ANALYSIS, PUBLISHING].map((step, index) => ({
    ...step,
    state: states[index] ?? 'wait',
  }))
}

/** Nothing has started: every stage waits and none is current. */
export const Waiting: Story = { args: { steps: steps('wait', 'wait', 'wait') } }

/** One stage finished, one in progress, one waiting. */
export const Running: Story = { args: { steps: steps('finish', 'process', 'wait') } }

export const Finished: Story = { args: { steps: steps('finish', 'finish', 'finish') } }

/** A failed stage carries the error code on the line below its title. */
export const Failed: Story = {
  args: {
    steps: [
      { ...CONTEXT, state: 'finish' },
      { ...ANALYSIS, state: 'error', note: 'llm_timeout' },
      { ...PUBLISHING, state: 'wait' },
    ],
  },
}

/** A cancelled run: nothing broke, so the stage is stopped, not failed. */
export const Stopped: Story = {
  args: {
    steps: [
      { ...CONTEXT, state: 'finish' },
      { ...ANALYSIS, state: 'stopped', note: 'Остановлено' },
      { ...PUBLISHING, state: 'wait' },
    ],
  },
}
