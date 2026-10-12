import type { Meta, StoryObj } from '@storybook/react-vite'

import { TraceTree } from './TraceTree'

const meta: Meta<typeof TraceTree> = {
  title: 'Свои компоненты/TraceTree',
  component: TraceTree,
  args: {
    defaultExpandedKeys: ['tree'],
    defaultSelectedKeys: ['1'],
    treeData: [
      { key: '0', title: '#0 get_pull_request (<1 с)', isLeaf: true },
      { key: '1', title: '#1 get_diff (<1 с)', isLeaf: true },
      {
        key: 'tree',
        title: 'get_tree ×3',
        children: [
          { key: '2', title: '#2 get_tree (<1 с)', isLeaf: true },
          { key: '3', title: '#3 get_tree (<1 с)', isLeaf: true },
          { key: '4', title: '#4 get_tree (<1 с)', isLeaf: true },
        ],
      },
      { key: '33', title: '#33 post_review (<1 с)', isLeaf: true },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof TraceTree>

/** The log of actions of a run. The second row is selected: neutral grey, as everywhere. */
export const Default: Story = {}
