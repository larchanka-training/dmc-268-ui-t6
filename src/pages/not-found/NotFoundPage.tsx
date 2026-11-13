import { Button, Result } from 'antd'
import type { FC } from 'react'
import { useHref, useLinkClickHandler } from 'react-router'

import { useTranslation } from '../../shared/i18n'
import styles from './NotFoundPage.module.css'

const REPOSITORIES = '/repositories'

/**
 * What an unknown address shows inside the app shell, in place of a silent redirect: the address
 * stays in the browser, and the button is a real link to the repositories (it opens in a new tab
 * and navigates without a page load). The title is the page's heading.
 */
export const NotFoundPage: FC = () => {
  const { t } = useTranslation()
  const href = useHref(REPOSITORIES)
  const handleClick = useLinkClickHandler<HTMLAnchorElement | HTMLButtonElement>(REPOSITORIES)

  return (
    <Result
      extra={
        <Button href={href} onClick={handleClick} type="primary">
          {t('layout.notFound.toRepositories')}
        </Button>
      }
      status="404"
      subTitle={t('layout.notFound.description')}
      title={<h1 className={styles.title}>{t('layout.notFound.title')}</h1>}
    />
  )
}
