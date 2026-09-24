import type { JSX } from 'react'
import { Alert, List } from 'antd'

import type { FileDiff } from '../../../entities/diff'
import type { ReviewComment } from '../../../entities/review'
import { DiffViewer } from './DiffViewer'

interface RunDiffProps {
  summaryOnly: boolean
  files: FileDiff[]
  comments: ReviewComment[]
}

export function RunDiff(props: RunDiffProps): JSX.Element {
  const { summaryOnly, files, comments } = props

  if (summaryOnly) {
    return (
      <div>
        <Alert
          type="info"
          title="Дифф слишком большой"
          description="Больше 3 000 строк — показан только список файлов, построчного ревью нет."
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
          <DiffViewer file={file} comments={comments} />
        </div>
      ))}
    </div>
  )
}
