import { App, Button, Flex, Typography } from 'antd'
import { useState, type FC } from 'react'

import { useTranslation } from '../../../shared/i18n'
import type { VcsProvider } from '../../../shared/model/provider'
import { CodeBlock } from '../../../shared/ui'
import { buildBadgeSnippet, getBadgePath } from '../lib/badgeSnippet'
import styles from './RepositoryBadgeSection.module.css'

const { Text } = Typography

export interface RepositoryBadgeSectionProps {
  provider: VcsProvider
  fullName: string
}

export const RepositoryBadgeSection: FC<RepositoryBadgeSectionProps> = ({ provider, fullName }) => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [previewError, setPreviewError] = useState(false)

  if (provider !== 'github') {
    return null
  }

  const origin = window.location.origin
  const previewPath = getBadgePath(fullName)
  const snippet = buildBadgeSnippet(fullName, origin)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      void message.success(t('settings.badge.copied'))
    } catch {
      void message.error(t('settings.badge.copyFailed'))
    }
  }

  return (
    <section aria-label={t('settings.badge.title')} className={styles.root}>
      <Text strong>{t('settings.badge.title')}</Text>
      <div className={styles.previewContainer}>
        {previewError ? (
          <Text type="secondary">{t('settings.badge.previewUnavailable')}</Text>
        ) : (
          <img
            alt={t('settings.badge.title')}
            className={styles.previewImage}
            onError={() => {
              setPreviewError(true)
            }}
            src={previewPath}
          />
        )}
      </div>
      <Text className={styles.notice} type="secondary">
        {t('settings.badge.publicOnlyNotice')}
      </Text>
      <Flex align="center" className={styles.snippetRow} gap={8}>
        <div
          aria-label={t('settings.badge.snippetLabel')}
          className={styles.snippetBox}
          role="region"
          tabIndex={0}
        >
          <CodeBlock>{snippet}</CodeBlock>
        </div>
        <Button
          onClick={() => {
            void handleCopy()
          }}
        >
          {t('settings.badge.copy')}
        </Button>
      </Flex>
    </section>
  )
}
