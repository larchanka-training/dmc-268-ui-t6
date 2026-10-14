import { RightOutlined } from '@ant-design/icons'
import { Alert, App, Breadcrumb, Button, Empty, Flex, Skeleton } from 'antd'
import { useState, type FC, type ReactNode } from 'react'
import { Link, useHref, useLinkClickHandler, useParams } from 'react-router'

import {
  RepositoryIdSchema,
  useRepository,
  useUpdateRepository,
  type Repository,
  type UpdateRepositoryInput,
} from '../../entities/repository'
import { runListHref } from '../../features/run-list-filter'
import { AutoReviewSwitch, RepositorySettingsForm } from '../../features/repository-settings'
import { mocksEnabledAtRuntime } from '../../shared/config/buildFlags'
import { isMockMode } from '../../shared/config/env'
import { PageHeader } from '../../shared/ui'
import { RulesStatusPanel } from '../../widgets/repository-rules'
import { formatErrorMessage } from './lib/formatError'

/** A button that is a real link: it opens in a new tab and navigates without a page load. */
const LinkButton: FC<{ to: string; children: ReactNode }> = ({ to, children }) => {
  const href = useHref(to)
  const handleClick = useLinkClickHandler<HTMLAnchorElement | HTMLButtonElement>(to)
  return (
    <Button href={href} onClick={handleClick}>
      {children}
    </Button>
  )
}

const NotAvailable: FC<{ description: string }> = ({ description }) => (
  <Empty description={description}>
    <LinkButton to="/repositories">К списку репозиториев</LinkButton>
  </Empty>
)

const RepositorySettingsContent: FC<{ repoId: string }> = ({ repoId }) => {
  const { message } = App.useApp()
  const { data: repository, isPending, isError, isFetching, error, refetch } = useRepository(repoId)
  const updateMutation = useUpdateRepository()

  // The form is built once from the repository, so it waits for the request that opening the
  // page sends: the cached list may be old. The wait ends once and stays ended: later refetches
  // (a save invalidates the list) must not take the form away. A request that fails or is
  // paused ends it too, and the form opens with what the cache holds.
  const [openingRequestDone, setOpeningRequestDone] = useState(false)
  if (!openingRequestDone && !isFetching) {
    setOpeningRequestDone(true)
  }

  // A repository that is on screen stays on screen: a failed background refetch keeps `data`
  // and must not unmount the form with the typed values.
  if (repository !== undefined && openingRequestDone) {
    const handleSave = async (patch: UpdateRepositoryInput): Promise<Repository> => {
      const saved = await updateMutation.mutateAsync({ id: repository.id, patch })
      void message.success('Настройки репозитория успешно сохранены')
      return saved
    }

    const handleToggleAutoReview = async (enabled: boolean): Promise<void> => {
      await updateMutation.mutateAsync({ id: repository.id, patch: { enabled } })
      void message.success(
        enabled ? 'Автоматическое ревью включено' : 'Автоматическое ревью выключено',
      )
    }

    return (
      <Flex gap="middle" vertical>
        <Breadcrumb
          items={[{ title: <Link to="/repositories">Репозитории</Link> }, { title: 'Настройки' }]}
          separator={<RightOutlined />}
        />
        <PageHeader
          actions={
            <LinkButton to={runListHref({ repo: repository.fullName })}>
              История проверок
            </LinkButton>
          }
          description={repository.fullName}
          title="Настройки репозитория"
        />
        <AutoReviewSwitch
          describeError={(err) =>
            formatErrorMessage(err, 'Не удалось изменить автоматическое ревью')
          }
          enabled={repository.enabled}
          installationAvailable={repository.installationAvailable}
          onChange={handleToggleAutoReview}
        />
        <RepositorySettingsForm
          describeError={(err) => formatErrorMessage(err, 'Не удалось сохранить настройки')}
          onSave={handleSave}
          repository={repository}
        />
        {/* Mock-only until the server serves the rules status (ui#93): off mocks the block says so
            and sends no request. */}
        <RulesStatusPanel enabled={mocksEnabledAtRuntime(isMockMode)} repoId={repository.id} />
      </Flex>
    )
  }

  // Also the case of a cached list that lacks the repository: the answer to come may have it.
  if (isPending || !openingRequestDone) {
    return <Skeleton active />
  }

  if (isError) {
    return (
      <Alert
        action={
          <Button
            loading={isFetching}
            onClick={() => void refetch({ cancelRefetch: false })}
            size="small"
            type="primary"
          >
            Повторить попытку
          </Button>
        }
        description={formatErrorMessage(error, 'Не удалось загрузить репозиторий')}
        showIcon
        title="Ошибка загрузки данных"
        type="error"
      />
    )
  }

  return <NotAvailable description="Репозиторий не найден или недоступен" />
}

export const RepositorySettingsPage: FC = () => {
  const { repoId } = useParams<{ repoId: string }>()
  // The address is external input. A bad one stops here, before any request is made.
  const parsed = RepositoryIdSchema.safeParse(repoId)
  if (!parsed.success) {
    return <NotAvailable description="Некорректная ссылка на репозиторий" />
  }
  // The key gives every repository its own form and its own state.
  return <RepositorySettingsContent key={parsed.data} repoId={parsed.data} />
}
