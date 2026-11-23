import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'

import { LinkButton } from './LinkButton'

const meta: Meta<typeof LinkButton> = {
  title: 'Свои компоненты/LinkButton',
  component: LinkButton,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof LinkButton>

export const Default: Story = {
  render: () => <LinkButton to="/repositories">К списку репозиториев</LinkButton>,
}

export const Primary: Story = {
  render: () => (
    <LinkButton to="/repositories" type="primary">
      К списку репозиториев
    </LinkButton>
  ),
}

export const Disabled: Story = {
  render: () => (
    <LinkButton disabled to="/repositories">
      Недоступная ссылка
    </LinkButton>
  ),
}
