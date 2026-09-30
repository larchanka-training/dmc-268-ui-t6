import type { JSX } from 'react'
import { Alert, List } from 'antd'

import type { FileDiff } from '../../../entities/diff'
import type { FindingView } from '../../../entities/review'
import { DiffViewer } from './DiffViewer'

interface RunDiffProps {
  summaryOnly: boolean
  files: FileDiff[]
  findings: FindingView[]
}

export function RunDiff(props: RunDiffProps): JSX.Element {
  const { summaryOnly, files, findings } = props

  if (summaryOnly) {
    return (
      <div>
        <Alert
          description="Больше 3 000 строк — показан только список файлов, построчного ревью нет."
          title="Дифф слишком большой"
          type="info"
        />
        <List
          dataSource={files.map((f) => f.filename)}
          renderItem={(filename) => <List.Item>{filename}</List.Item>}
        />
      </div>
    )
  }

  return (
    <div>
      {files.map((file) => (
        <div key={file.filename}>
          <DiffViewer file={file} findings={findings} />
        </div>
      ))}
    </div>
  )
}
