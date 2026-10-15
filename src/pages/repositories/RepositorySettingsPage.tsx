import { RightOutlined } from '@ant-design/icons'
import { Alert, App, Breadcrumb, Button, Empty, Flex, Skeleton } from 'antd'
import { useRef, useState, type FC, type MouseEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Link, useHref, useLinkClickHandler, useParams } from 'react-router'

import {
  RepositoryIdSchema,
  useRepository,
  useUpdateRepository,
  type Repository,
  type UpdateRepositoryInput,
} from '../../entities/repository'
import { runListHref } from '../../features/run-list-filter'
import {
  AutoReviewSwitch,
  RepositorySettingsForm,
  type RepositorySettingsFormHandle,
} from '../../features/repository-settings'
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

const STALE_NOTICE = 'Не удалось обновить настройки. Показаны значения, загруженные ранее.'

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
  // paused ends it too, and the form opens with what the cache holds. A failed one also says so
  // (`staleNotice`), until some later answer is not an error: a retry, a refocused window, the
  // refetch after a save. A failure after the page opened says nothing.
  const [openingRequestDone, setOpeningRequestDone] = useState(false)
  const [staleNotice, setStaleNotice] = useState(false)
  if (!openingRequestDone && !isFetching) {
    setOpeningRequestDone(true)
    setStaleNotice(isError)
  } else if (staleNotice && !isFetching && !isError) {
    setStaleNotice(false)
  }

  // The form reads its values once. A retry that brings fresh ones remounts it (`formEpoch` is
  // part of its key), unless the user has typed something in the meantime.
  const formRef = useRef<RepositorySettingsFormHandle>(null)
  const [formEpoch, setFormEpoch] = useState(0)

  const handleRetryRefresh = async (event: MouseEvent<HTMLElement>): Promise<void> => {
    const retry = event.currentTarget
    const hadFocus = document.activeElement === retry
    const result = await refetch({ cancelRefetch: false })
    if (result.isError) {
      // The notice and the retry button stay, and so does the focus.
      return
    }
    // Asked now, not at the click: the user may have typed while the request ran.
    if (formRef.current?.hasUnsavedChanges() !== true) {
      flushSync(() => {
        setFormEpoch((epoch) => epoch + 1)
      })
    }
    // The retry button goes with the notice: the first field takes the focus it had, unless the
    // user has moved on.
    const active = document.activeElement
    if (hadFocus && (active === retry || active === document.body)) {
      formRef.current?.focusFirstField()
    }
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
        {staleNotice ? (
          <Alert
            action={
              <Button
                loading={isFetching}
                onClick={(event) => void handleRetryRefresh(event)}
                size="small"
              >
                Повторить попытку
              </Button>
            }
            showIcon
            title={STALE_NOTICE}
            type="warning"
          />
        ) : null}
        <AutoReviewSwitch
          describeError={(err) =>
            formatErrorMessage(err, 'Не удалось изменить автоматическое ревью')
          }
          enabled={repository.enabled}
          installationAvailable={repository.installationAvailable}
          onChange={handleToggleAutoReview}
        />
        <RepositorySettingsForm
          key={formEpoch}
          describeError={(err) => formatErrorMessage(err, 'Не удалось сохранить настройки')}
          onSave={handleSave}
          ref={formRef}
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
