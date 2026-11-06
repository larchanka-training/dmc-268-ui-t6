import { Button, Card, Typography } from 'antd'
import { useState, type FC, type ReactNode } from 'react'
import { Link } from 'react-router'

import type { Repository } from '../../../entities/repository'
import type { RunSession } from '../../../entities/run'
import { GITHUB_APP_SLUG } from '../../../shared/config/env'
import { useTranslation } from '../../../shared/i18n'
import { safeHttpUrl } from '../../../shared/lib/safeHttpUrl'
import { Tag } from '../../../shared/ui'
import {
  dismissOnboarding,
  getOnboardingProgress,
  hasViewedRepositorySettings,
  hasViewedSuccessfulRun,
  isOnboardingDismissed,
} from '../lib/onboarding'
import styles from './OnboardingChecklist.module.css'

interface OnboardingChecklistProps {
  userId: number
  hasInstallation: boolean
  repositories: readonly Pick<
    Repository,
    'id' | 'provider' | 'fullName' | 'url' | 'installationAvailable' | 'enabled'
  >[]
  runs: readonly Pick<RunSession, 'id' | 'status'>[]
}

export const OnboardingChecklist: FC<OnboardingChecklistProps> = ({
  userId,
  hasInstallation,
  repositories,
  runs,
}) => {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(() => isOnboardingDismissed(userId))
  const viewedResult = hasViewedSuccessfulRun(userId)
  const progress = getOnboardingProgress({
    hasInstallation,
    repositories,
    runs,
    viewedSettingsRepoIds: repositories
      .filter((repo) => hasViewedRepositorySettings(userId, repo.id))
      .map((repo) => repo.id),
    viewedResult,
  })
  const accessibleRepo = repositories.find(
    (repo) => repo.provider === 'github' && repo.installationAvailable,
  )
  const activeRepo = repositories.find(
    (repo) => repo.provider === 'github' && repo.installationAvailable && repo.enabled,
  )
  const firstRun = runs.find((run) => run.status === 'succeeded') ?? runs[0]
  const installUrl = GITHUB_APP_SLUG
    ? `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`
    : undefined
  const repoUrl = activeRepo ? safeHttpUrl(activeRepo.url) : null
  const pullRequestUrl = repoUrl ? `${repoUrl.replace(/\/$/, '')}/compare` : null

  if (dismissed || viewedResult) return null

  const steps: { title: string; description: string; action: ReactNode }[] = [
    {
      title: t('onboarding.installTitle'),
      description: t('onboarding.installDescription'),
      action: installUrl ? (
        <a href={installUrl} rel="noopener noreferrer" target="_blank">
          {t('onboarding.installAction')}
        </a>
      ) : (
        <Button disabled size="small">
          {t('onboarding.installAction')}
        </Button>
      ),
    },
    {
      title: t('onboarding.settingsTitle'),
      description: t('onboarding.settingsDescription'),
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
      action: firstRun ? (
        <Link to={`/runs/${firstRun.id}`}>{t('onboarding.resultAction')}</Link>
      ) : (
        <Link to="/runs">{t('onboarding.runsAction')}</Link>
      ),
    },
  ]

  return (
    <Card
      extra={
        <Button
          onClick={() => {
            dismissOnboarding(userId)
            setDismissed(true)
          }}
          size="small"
          type="text"
        >
          {t('onboarding.hide')}
        </Button>
      }
      title={<h2 className={styles.title}>{t('onboarding.title')}</h2>}
    >
      <Typography.Paragraph>{t('onboarding.intro')}</Typography.Paragraph>
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li className={styles.step} key={step.title}>
            <div>
              <strong>{step.title}</strong>{' '}
              <Tag tone={progress[index] ? 'success' : 'neutral'}>
                {progress[index] ? t('onboarding.done') : t('onboarding.todo')}
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
