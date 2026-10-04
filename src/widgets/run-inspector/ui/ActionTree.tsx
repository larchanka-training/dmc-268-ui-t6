import type { JSX, ReactNode } from 'react'
import { Collapse, Spin, Tree, Typography } from 'antd'
import type { TreeDataNode } from 'antd'

import type { ActionTreeNode, RunAction } from '../../../entities/run'
import { groupActions, useRunActionResponse } from '../../../entities/run'
import { formatDuration } from '../lib/format'
import { useRunInspectorStore } from '../model/store'

interface ActionTreeProps {
  actions: RunAction[]
  runId: string
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
  const { actions, runId } = props
  const treeData = groupActions(actions).map(toDataNode)
  const expandedKeys = useRunInspectorStore((s) => s.expandedKeys)
  const setExpandedKeys = useRunInspectorStore((s) => s.setExpandedKeys)
  const selectedActionIndex = useRunInspectorStore((s) => s.selectedActionIndex)
  const selectAction = useRunInspectorStore((s) => s.selectAction)
  const responseQuery = useRunActionResponse(runId, selectedActionIndex)

  const selectedKeys = selectedActionIndex !== null ? [`action-${String(selectedActionIndex)}`] : []
  const selectedAction = actions.find((action) => action.index === selectedActionIndex)

  function responseBody(): ReactNode {
    if (selectedAction === undefined) {
      return null
    }
    if (selectedAction.response !== null) {
      return <pre>{JSON.stringify(selectedAction.response, null, 2)}</pre>
    }
    if (selectedAction.responseRef === null) {
      return <Typography.Text type="secondary">—</Typography.Text>
    }
    if (responseQuery.isLoading) {
      return <Spin size="small" />
    }
    if (responseQuery.isError) {
      return <Typography.Text type="danger">Не удалось загрузить ответ</Typography.Text>
    }
    return <pre>{JSON.stringify(responseQuery.data, null, 2)}</pre>
  }

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
              children: responseBody(),
            },
          ]}
        />
      ) : null}
    </div>
  )
}
