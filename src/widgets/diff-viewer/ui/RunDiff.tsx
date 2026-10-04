import type { JSX } from 'react'
import { Alert, List } from 'antd'

import type { FileDiff } from '../../../entities/diff'
import type { FindingView, ReviewComment } from '../../../entities/review'
import type { ContextGap } from '../model/types'
import { InlineComment } from './InlineComment'
import { DiffViewer } from './DiffViewer'

interface RunDiffProps {
  summaryOnly: boolean
  files: FileDiff[]
  findings: FindingView[]
  comments?: ReviewComment[]
  fileTotalLines?: Record<string, number>
  onLoadMore?: (file: FileDiff, gap: ContextGap) => void
}

function findingsOutsideVisibleDiff(files: FileDiff[], findings: FindingView[]): FindingView[] {
  const byFilename = new Map(files.map((file) => [file.filename, file]))
  return findings.filter((finding) => {
    const file = byFilename.get(finding.file)
    if (file === undefined) {
      return true
    }
    return !file.hasPatch || file.chunks.length === 0
  })
}

export function RunDiff(props: RunDiffProps): JSX.Element {
  const { summaryOnly, files, findings, comments = [], fileTotalLines, onLoadMore } = props

  const outsideFindings = findingsOutsideVisibleDiff(files, findings)

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
        {outsideFindings.length > 0 ? (
          <Alert
            data-testid="findings-outside-diff"
            description={
              <div>
                {outsideFindings.map((finding) => (
                  <InlineComment
                    file={{ filename: finding.file, chunks: [], hasPatch: false }}
                    finding={finding}
                    key={finding.id}
                  />
                ))}
              </div>
            }
            style={{ marginTop: 12 }}
            title="Замечания вне диффа"
            type="warning"
          />
        ) : null}
      </div>
    )
  }

  return (
    <div>
      {files.map((file) => (
        <div key={file.filename}>
          <DiffViewer
            comments={comments}
            file={file}
            findings={findings}
            onLoadMore={
              onLoadMore
                ? (gap) => {
                    onLoadMore(file, gap)
                  }
                : undefined
            }
            totalLines={fileTotalLines?.[file.filename]}
          />
        </div>
      ))}
      {outsideFindings.length > 0 ? (
        <Alert
          data-testid="findings-outside-diff"
          description={
            <div>
              {outsideFindings.map((finding) => (
                <InlineComment
                  file={{ filename: finding.file, chunks: [], hasPatch: false }}
                  finding={finding}
                  key={finding.id}
                />
              ))}
            </div>
          }
          style={{ marginTop: 12 }}
          title="Замечания вне диффа"
          type="warning"
        />
      ) : null}
    </div>
  )
}
