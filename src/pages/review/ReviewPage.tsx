import { FileTextOutlined } from '@ant-design/icons'
import { Card, Flex, Select, Space, Typography } from 'antd'
import { useState, type FC } from 'react'

import { mockFileDiffs, mockReviewComments } from '../../app/mocks/app-state'
import { AppLayout } from '../../widgets/app-layout'
import { DiffViewer } from '../../widgets/diff-viewer'

const { Title, Text } = Typography

export interface ReviewPageProps {
  onNavigate?: (path: string) => void
}

export const ReviewPage: FC<ReviewPageProps> = ({ onNavigate }) => {
  const [selectedFilename, setSelectedFilename] = useState<string>(mockFileDiffs[0]?.filename ?? '')

  const currentFileDiff =
    mockFileDiffs.find((f) => f.filename === selectedFilename) ?? mockFileDiffs[0]

  const currentComments = mockReviewComments.filter((c) => c.file === currentFileDiff?.filename)

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

            <Space>
              <Text strong>Файл:</Text>
              <Select
                onChange={(val) => {
                  setSelectedFilename(val)
                }}
                options={mockFileDiffs.map((f) => ({
                  value: f.filename,
                  label: (
                    <Space>
                      <FileTextOutlined />
                      <span>{f.filename}</span>
                    </Space>
                  ),
                }))}
                style={{ minWidth: 260 }}
                value={selectedFilename}
              />
            </Space>
          </Flex>
        </Card>

        {currentFileDiff ? <DiffViewer comments={currentComments} file={currentFileDiff} /> : null}
      </Flex>
    </AppLayout>
  )
}
