import type { JSX } from 'react'
import { Collapse, Tree, Typography } from 'antd'
import type { TreeDataNode } from 'antd'

import type { ActionTreeNode, RunAction } from '../../../entities/run'
import { groupActions } from '../../../entities/run'
import { formatDuration } from '../lib/format'
import { useRunInspectorStore } from '../model/store'

interface ActionTreeProps {
  actions: RunAction[]
}

function actionTitle(action: RunAction): string {
  return `#${String(action.index)} ${action.tool} (${formatDuration(action.durationMs)})`
}

function firstActionIndex(actions: RunAction[]): number {
  const first = actions[0]
  if (first === undefined) {
    throw new Error('group node without actions')
  }
  return first.index
}

function toDataNode(node: ActionTreeNode): TreeDataNode {
  if (node.kind === 'group') {
    return {
      key: `group-${String(firstActionIndex(node.actions))}`,
      title: `${node.tool} ×${String(node.count)}`,
      children: node.actions.map((action): TreeDataNode => ({
        key: `action-${String(action.index)}`,
        title: actionTitle(action),
        isLeaf: true,
      })),
    }
  }
  return {
    key: `action-${String(node.action.index)}`,
    title: actionTitle(node.action),
    isLeaf: true,
  }
}

function parseActionIndex(key: string): number | null {
  if (!key.startsWith('action-')) {
    return null
  }
  const value = Number(key.slice('action-'.length))
  return Number.isNaN(value) ? null : value
}

export function ActionTree(props: ActionTreeProps): JSX.Element {
  const { actions } = props
  const treeData = groupActions(actions).map(toDataNode)
  const expandedKeys = useRunInspectorStore((s) => s.expandedKeys)
  const setExpandedKeys = useRunInspectorStore((s) => s.setExpandedKeys)
  const selectedActionIndex = useRunInspectorStore((s) => s.selectedActionIndex)
  const selectAction = useRunInspectorStore((s) => s.selectAction)

  const selectedKeys = selectedActionIndex !== null ? [`action-${String(selectedActionIndex)}`] : []
  const selectedAction = actions.find((action) => action.index === selectedActionIndex)

  return (
    <div>
      <Tree
        treeData={treeData}
        expandedKeys={expandedKeys}
        onExpand={(keys) => {
          setExpandedKeys(keys.map((key) => String(key)))
        }}
        selectedKeys={selectedKeys}
        onSelect={(keys) => {
          const key = keys[0]
          selectAction(key === undefined ? null : parseActionIndex(String(key)))
        }}
      />
      {selectedAction ? (
        <Collapse
          key={selectedAction.index}
          defaultActiveKey={['request', 'response']}
          items={[
            {
              key: 'request',
              label: 'request',
              children: <pre>{JSON.stringify(selectedAction.request, null, 2)}</pre>,
            },
            {
              key: 'response',
              label: 'response',
              children:
                selectedAction.response === null && selectedAction.responseRef !== null ? (
                  <Typography.Text type="secondary">
                    {`тело вынесено: ${selectedAction.responseRef}`}
                  </Typography.Text>
                ) : (
                  <pre>{JSON.stringify(selectedAction.response, null, 2)}</pre>
                ),
            },
          ]}
        />
      ) : null}
    </div>
  )
}
