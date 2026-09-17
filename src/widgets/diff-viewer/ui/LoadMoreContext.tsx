import type { JSX } from 'react'
import { Button } from 'antd'

import type { ContextGap } from '../model/types'

interface LoadMoreContextProps {
  gap: ContextGap
  onLoadMore: (gap: ContextGap) => void
}

export function LoadMoreContext(props: LoadMoreContextProps): JSX.Element {
  const { gap, onLoadMore } = props
  return (
    <Button
      size="small"
      type="link"
      onClick={() => {
        onLoadMore(gap)
      }}
    >
      {`Показать ещё ${String(gap.count)} строк`}
    </Button>
  )
}
