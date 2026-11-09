import type { JSX } from 'react'

import { useTranslation } from '../../shared/i18n'
import { PageHeader } from '../../shared/ui'

/** The rules playground (ui#187): code and rules to try a review on, nothing is saved. */
export function PlaygroundPage(): JSX.Element {
  const { t } = useTranslation()
  return <PageHeader description={t('playground.description')} title={t('playground.title')} />
}
