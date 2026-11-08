import type { Meta, StoryObj } from '@storybook/react-vite'
import { Breadcrumb, Button, Collapse, Pagination, Tree } from 'antd'

const meta: Meta = {
  title: 'Ant Design/Data',
}

export default meta
type Story = StoryObj

/** The second row is selected: neutral grey, as everywhere. */
export const ActionTree: Story = {
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <Tree
        defaultExpandedKeys={['tree']}
        defaultSelectedKeys={['1']}
        treeData={[
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
        ]}
      />
    </div>
  ),
}

export const Panels: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Collapse
        defaultActiveKey={['request']}
        items={[
          { key: 'request', label: 'request', children: <pre>{'{ "pull_number": 34 }'}</pre> },
          { key: 'response', label: 'response', children: <pre>{'{ "status": 200 }'}</pre> },
        ]}
        size="small"
      />
    </div>
  ),
}

/** Every item but the last is a link. */
export const Path: Story = {
  render: () => <Breadcrumb items={[{ title: 'Прогоны', href: '#runs' }, { title: 'PR #34' }]} />,
}

/** Enough pages to reach both jump controls with the keyboard. */
export const PaginationFocus: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <Button>Перед пагинацией</Button>
      <Pagination defaultCurrent={6} pageSize={10} showSizeChanger={false} total={500} />
      <Button>После пагинации</Button>
    </div>
  ),
}
