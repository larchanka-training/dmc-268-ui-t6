import { FileTextOutlined } from '@ant-design/icons'
import { Card, Empty, Flex, Select, Space, Typography } from 'antd'
import { useState, type FC } from 'react'

import type { FileDiff } from '../../entities/diff'
import type { ReviewComment } from '../../entities/review'
import { AppLayout } from '../../widgets/app-layout'
import { DiffViewer } from '../../widgets/diff-viewer'

const { Title, Text } = Typography

export interface ReviewPageProps {
  onNavigate?: (path: string) => void
  fileDiffs?: FileDiff[]
  reviewComments?: ReviewComment[]
}

export const ReviewPage: FC<ReviewPageProps> = ({
  onNavigate,
  fileDiffs = [],
  reviewComments = [],
}) => {
  const [selectedFilename, setSelectedFilename] = useState<string>(fileDiffs[0]?.filename ?? '')

  const currentFileDiff = fileDiffs.find((f) => f.filename === selectedFilename) ?? fileDiffs[0]

  const currentComments = reviewComments.filter((c) => c.file === currentFileDiff?.filename)

  return (
    <AppLayout currentPath="/review" onNavigate={onNavigate}>
      <Flex vertical gap="large">
        <Card>
          <Flex align="center" justify="space-between" wrap="wrap" gap="middle">
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Просмотрщик диффа и замечаний
              </Title>
              <Text type="secondary">Инспекция измененных файлов и замечаний AI Reviewer</Text>
            </div>

            {fileDiffs.length > 0 ? (
              <Space>
                <Text strong>Файл:</Text>
                <Select
                  onChange={(val) => {
                    setSelectedFilename(val)
                  }}
                  options={fileDiffs.map((f) => ({
                    value: f.filename,
                    label: (
                      <Space>
                        <FileTextOutlined />
                        <span>{f.filename}</span>
                      </Space>
                    ),
                  }))}
                  style={{ minWidth: 260 }}
                  value={currentFileDiff?.filename}
                />
              </Space>
            ) : null}
          </Flex>
        </Card>

        {currentFileDiff ? (
          <DiffViewer comments={currentComments} file={currentFileDiff} />
        ) : (
          <Card>
            <Empty description="Нет файлов диффа для отображения" />
          </Card>
        )}
      </Flex>
    </AppLayout>
  )
}
