import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from 'antd'
import { useState, type JSX } from 'react'

import { PageLoaderHost, PageLoading } from './PageLoader'

const meta: Meta<typeof PageLoaderHost> = {
  title: 'Свои компоненты/PageLoader',
  component: PageLoaderHost,
}

export default meta
type Story = StoryObj<typeof PageLoaderHost>

// The mock transport answers in 0 ms, so the app itself rarely waits long enough to show the ring.
// The button stands in for a page that is loading.
function Waiting(): JSX.Element {
  const [waiting, setWaiting] = useState(false)
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <PageLoaderHost />
      {waiting ? <PageLoading /> : null}
      <Button
        onClick={() => {
          setWaiting((value) => !value)
        }}
        type="primary"
      >
        {waiting ? 'Страница загрузилась' : 'Начать загрузку'}
      </Button>
      <span style={{ color: 'var(--rv-text-2)' }}>
        Кольцо появляется в центре окна через 300 мс ожидания и плавно гаснет за 200 мс после
        загрузки. Нажать дважды быстрее чем за 300 мс: кольца не будет совсем.
      </span>
    </div>
  )
}

export const Playground: Story = { render: () => <Waiting /> }
