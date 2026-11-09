import type { Meta, StoryObj } from '@storybook/react-vite'

import { ErrorBoundary } from './ErrorBoundary'

function BrokenBlock(): never {
  throw new Error('Story: the block failed while rendering')
}

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Свои компоненты/ErrorBoundary',
  component: ErrorBoundary,
}

export default meta
type Story = StoryObj<typeof ErrorBoundary>

export const Children: Story = {
  args: { children: <p>Блок отрисовался без ошибок</p> },
}

export const BlockStub: Story = {
  args: { children: <BrokenBlock /> },
}
