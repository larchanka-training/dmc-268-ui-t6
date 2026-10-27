import type { JSX } from 'react'
import { Button } from 'antd'

import { useTranslation } from '../../../shared/i18n'
import { contextChunkLimit } from '../lib/contextChunkSize'
import type { ContextGap } from '../model/types'

interface LoadMoreContextProps {
  gap: ContextGap
  onLoadMore: (gap: ContextGap) => void
}

export function LoadMoreContext(props: LoadMoreContextProps): JSX.Element {
  const { gap, onLoadMore } = props
  const { t } = useTranslation()
  return (
    <Button
      size="small"
      type="link"
      onClick={() => {
        onLoadMore(gap)
      }}
    >
      {t('runs.diff.showMore', { count: contextChunkLimit(gap.count) })}
    </Button>
  )
}
