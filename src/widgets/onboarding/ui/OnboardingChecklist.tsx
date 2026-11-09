import { Button, Card, Typography } from 'antd'
import { useState, type FC, type ReactNode } from 'react'
import { Link } from 'react-router'

import type { Repository } from '../../../entities/repository'
import type { RunSession } from '../../../entities/run'
import { GITHUB_APP_SLUG } from '../../../shared/config/env'
import { useTranslation } from '../../../shared/i18n'
import { githubAppInstallUrl } from '../../../shared/lib/githubAppInstallUrl'
import { safeHttpUrl } from '../../../shared/lib/safeHttpUrl'
import { Tag } from '../../../shared/ui'
import { dismissOnboarding, getOnboardingProgress } from '../lib/onboarding'
import styles from './OnboardingChecklist.module.css'

interface OnboardingChecklistProps {
  userId: number
  hasInstallation: boolean
  repositories: readonly Pick<
    Repository,
    'id' | 'provider' | 'fullName' | 'url' | 'installationAvailable' | 'enabled' | 'defaultBranch'
  >[]
  runs: readonly Pick<RunSession, 'id' | 'status'>[] | undefined
  successfulRuns: readonly Pick<RunSession, 'id' | 'status'>[] | undefined
  runsError: boolean
  onRetryRuns: () => void
  onDismiss: () => void
}

export const OnboardingChecklist: FC<OnboardingChecklistProps> = ({
  userId,
  hasInstallation,
  repositories,
  runs,
  successfulRuns,
  runsError,
  onRetryRuns,
  onDismiss,
}) => {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(false)
  const progress = getOnboardingProgress({
    hasInstallation,
    repositories,
    runs,
    successfulRuns,
  })
  const accessibleRepo = repositories.find(
    (repo) => repo.provider === 'github' && repo.installationAvailable,
  )
  const activeRepo = repositories.find(
    (repo) => repo.provider === 'github' && repo.installationAvailable && repo.enabled,
  )
  const installUrl = githubAppInstallUrl(GITHUB_APP_SLUG)
  const repoUrl = activeRepo ? safeHttpUrl(activeRepo.url) : null
  const pullRequestUrl = repoUrl ? `${repoUrl.replace(/\/$/, '')}/compare` : null

  if (dismissed || progress.result) return null

  const steps: {
    title: string
    description: string
    action: ReactNode
    complete: boolean | null
  }[] = [
    {
      title: t('onboarding.installTitle'),
      description: t('onboarding.installDescription'),
      complete: progress.install,
      action: installUrl ? (
        <a href={installUrl} rel="noopener noreferrer" target="_blank">
          {t('onboarding.installAction')}
        </a>
      ) : (
        <span>
          <Button disabled>{t('onboarding.installAction')}</Button>{' '}
          <Typography.Text type="secondary">{t('onboarding.installUnavailable')}</Typography.Text>
        </span>
      ),
    },
    {
      title: t('onboarding.settingsTitle'),
      description: t('onboarding.settingsDescription'),
      complete: progress.settings,
      action: accessibleRepo ? (
        <Link to={`/repositories/${accessibleRepo.id}/settings`}>
          {t('onboarding.settingsAction')}
        </Link>
      ) : (
        <Link to="/repositories">{t('onboarding.repositoriesAction')}</Link>
      ),
    },
    {
      title: t('onboarding.reviewTitle'),
      description: t('onboarding.reviewDescription'),
      complete: progress.review,
      action: pullRequestUrl ? (
        <a href={pullRequestUrl} rel="noopener noreferrer" target="_blank">
          {t('onboarding.reviewAction')}
        </a>
      ) : (
        <Link to="/repositories">{t('onboarding.reviewSetupAction')}</Link>
      ),
    },
    {
      title: t('onboarding.resultTitle'),
      description: t('onboarding.resultDescription'),
      complete: progress.result,
      action: <Link to="/runs">{t('onboarding.runsAction')}</Link>,
    },
  ]

  return (
    <Card
      extra={
        <Button
          onClick={() => {
            dismissOnboarding(userId)
            setDismissed(true)
            onDismiss()
          }}
          type="text"
        >
          {t('onboarding.hide')}
        </Button>
      }
      title={<h2 className={styles.title}>{t('onboarding.title')}</h2>}
    >
      <Typography.Paragraph>{t('onboarding.intro')}</Typography.Paragraph>
      {runsError ? (
        <Typography.Paragraph role="alert">
          {t('onboarding.runsUnavailable')}{' '}
          <Button onClick={onRetryRuns} size="small" type="link">
            {t('common.errors.tryAgain')}
          </Button>
        </Typography.Paragraph>
      ) : null}
      <ol className={styles.steps}>
        {steps.map((step) => (
          <li className={styles.step} key={step.title}>
            <div>
              <strong>{step.title}</strong>{' '}
              <Tag tone={step.complete ? 'success' : 'neutral'}>
                {step.complete === null
                  ? t('onboarding.unknown')
                  : step.complete
                    ? t('onboarding.done')
                    : t('onboarding.todo')}
              </Tag>
              <div>{step.description}</div>
            </div>
            <div>{step.action}</div>
          </li>
        ))}
      </ol>
    </Card>
  )
}
