import { RightOutlined } from '@ant-design/icons'
import { useIsMutating } from '@tanstack/react-query'
import { Alert, App, Breadcrumb, Button, Empty, Flex, Skeleton } from 'antd'
import { useCallback, useEffect, useRef, useState, type FC, type ReactNode } from 'react'
import {
  Link,
  useBlocker,
  useHref,
  useLinkClickHandler,
  useParams,
  type BlockerFunction,
} from 'react-router'

import {
  RepositoryIdSchema,
  UPDATE_REPOSITORY_MUTATION_KEY,
  useRepository,
  useUpdateRepository,
  type Repository,
  type UpdateRepositoryInput,
} from '../../entities/repository'
import { runListHref } from '../../features/run-list-filter'
import {
  AutoReviewSwitch,
  autoReviewChoiceSaved,
  RepositorySettingsForm,
  type RepositorySettingsFormHandle,
} from '../../features/repository-settings'
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
const DIFFERS_NOTICE =
  'На сервере сохранены другие значения. В форме — ваши правки поверх загруженных ранее.'

/**
 * What stands above the auto-review switch about the values of the form: `stale` — the request
 * that opened the page failed and the form shows what the cache held; `differs` — fresh values
 * came, but the user has a draft over the old ones, which stays, and the server holds others.
 */
type FormNotice = 'stale' | 'differs' | null

const NotAvailable: FC<{ description: string }> = ({ description }) => (
  <Empty description={description}>
    <LinkButton to="/repositories">К списку репозиториев</LinkButton>
  </Empty>
)

const RepositorySettingsContent: FC<{ repoId: string }> = ({ repoId }) => {
  const { message, modal } = App.useApp()
  const { data: repository, isPending, isError, isFetching, error, refetch } = useRepository(repoId)
  const updateMutation = useUpdateRepository()

  // The form is built once from the repository, so it waits for the request that opening the
  // page sends: the cached list may be old. The wait ends once and stays ended: later refetches
  // (a save invalidates the list) must not take the form away. A request that fails or is
  // paused ends it too, and the form opens with what the cache holds. A failed one also says so
  // (`notice` is `stale`), until some later answer is not an error: a retry, a refocused window,
  // the refetch after a save. A failure after the page opened says nothing.
  const [openingRequestDone, setOpeningRequestDone] = useState(false)
  const [notice, setNotice] = useState<FormNotice>(null)
  if (!openingRequestDone && !isFetching) {
    setOpeningRequestDone(true)
    setNotice(isError ? 'stale' : null)
  }

  // The first answer that is not an error ends `stale`, whoever asked for it (the retry, a
  // refocused window, the refetch after a save), and brings the form up to date:
  //  - nothing typed: the form takes the fresh values, in place, so a focused field keeps its
  //    focus;
  //  - a draft, and the fresh values differ from what the form opened with: the draft stays and
  //    the user is told (`differs`), with a button that loads the fresh values;
  //  - a draft, and the fresh values are those the form opened with: nothing to say.
  // It is asked of the form here, in an effect, after the answer: the user may have typed while
  // the request ran. While a save runs the cache holds the optimistic copy of its patch, which
  // is not an answer of the server, so the effect waits for the refetch the save ends with.
  // `saving` counts every running save, the form's and the switch's together: the mutation of the
  // hook tracks only the latest one, and the guard would drop while the other still runs.
  const formRef = useRef<RepositorySettingsFormHandle>(null)
  const saving = useIsMutating({ mutationKey: UPDATE_REPOSITORY_MUTATION_KEY }) > 0
  useEffect(() => {
    const form = formRef.current
    if (notice !== 'stale' || isFetching || isError || saving || !form || !repository) {
      return
    }
    if (form.hasUnsavedChanges()) {
      setNotice(form.differsFromBaseline(repository) ? 'differs' : null)
    } else {
      form.resetTo(repository)
      setNotice(null)
    }
  }, [notice, isFetching, isError, saving, repository])

  // Leaving the page loses the draft (the form of this page is built once from the repository):
  // a move to another page asks first (decision D12). A change of the search or the hash keeps
  // the page, so it passes. The draft is asked of the form at the moment of the move, through the
  // same handle as above; no form on screen (loading, an error) means nothing to lose. One
  // dialog per block: its cleanup closes it, so a re-run of the effect cannot leave two.
  const shouldBlockLeaving = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname &&
      formRef.current?.hasUnsavedChanges() === true,
    [],
  )
  const blocker = useBlocker(shouldBlockLeaving)
  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return
    }
    const dialog = modal.confirm({
      title: 'Уйти без сохранения?',
      content: 'Изменения настроек не сохранены и пропадут.',
      okText: 'Уйти',
      // The danger button of the design system is the outlined one (DESIGN_SYSTEM §8, `antd.css`),
      // and «Сохранить» stays the only primary: the confirm's default OK would be a second one.
      okType: 'default',
      okButtonProps: { danger: true },
      cancelText: 'Остаться',
      // The safe answer takes the focus, so an Enter pressed at once keeps the draft. Through
      // `focusable`: the top-level `autoFocusButton` is deprecated in antd 6 (it logs a warning).
      focusable: { autoFocusButton: 'cancel' },
      onOk: () => {
        blocker.proceed()
      },
      onCancel: () => {
        blocker.reset()
      },
    })
    return () => {
      dialog.destroy()
    }
  }, [blocker, modal])

  // A reload or a tab close loses the draft too: the browser asks, with its own words.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (formRef.current?.hasUnsavedChanges() !== true) {
        return
      }
      event.preventDefault()
      // Browsers that predate `preventDefault()` for this event show the prompt only when this
      // is set; lib.dom marks it deprecated for that reason.
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- the legacy way to ask
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // The retry button goes away with the warning, and also because of a refetch it did not start
  // (a refocused window, the refetch after a save). If it held the focus, the control that takes
  // its place does: the button that loads the fresh values when the warning is replaced by the
  // notice about them, the first field otherwise. The retry is marked as it leaves the page,
  // while it is still in the document and `activeElement` tells whether it held the focus.
  const noticeRetryRef = useRef<HTMLButtonElement | null>(null)
  const loadServerRef = useRef<HTMLButtonElement | null>(null)
  const retryHadFocus = useRef(false)
  const trackNoticeRetry = useCallback((node: HTMLButtonElement | null) => {
    if (node !== null) {
      noticeRetryRef.current = node
      return
    }
    if (document.activeElement === noticeRetryRef.current) {
      retryHadFocus.current = true
    }
    noticeRetryRef.current = null
  }, [])
  useEffect(() => {
    if (notice === 'stale' || !retryHadFocus.current) {
      return
    }
    retryHadFocus.current = false
    // Not on <body>: the user has moved on, and keeps the focus where it is.
    if (document.activeElement !== document.body) {
      return
    }
    if (notice === 'differs') {
      loadServerRef.current?.focus()
    } else {
      formRef.current?.focusFirstField()
    }
  }, [notice])

  // A repository that is on screen stays on screen: a failed background refetch keeps `data`
  // and must not unmount the form with the typed values.
  if (repository !== undefined && openingRequestDone) {
    const handleSave = async (patch: UpdateRepositoryInput): Promise<Repository> => {
      const saved = await updateMutation.mutateAsync({ id: repository.id, patch })
      // The answer is the server's own: whatever the form showed over old values is settled now.
      setNotice(null)
      void message.success('Настройки репозитория успешно сохранены')
      return saved
    }

    // The latest values of the server, as the page holds them now. The button that used it leaves
    // the page with the notice, so the first field takes the focus. The button is disabled while
    // a save runs (the cache holds the optimistic copy of its patch then, and a failing save would
    // leave the form showing values the server does not hold). «Отменить изменения» is not held
    // back here: the form disables it during its own save, and the optimistic copy of an
    // auto-review toggle touches no field.
    const loadServerValues = (): void => {
      formRef.current?.resetTo(repository)
      setNotice(null)
      formRef.current?.focusFirstField()
    }

    const handleToggleAutoReview = async (enabled: boolean): Promise<void> => {
      const saved = await updateMutation.mutateAsync({ id: repository.id, patch: { enabled } })
      // The server serves `enabled AND installationAvailable`: without GitHub App access the
      // choice is kept but reads off, whichever way it went, and saying «включено» or «выключено»
      // would be wrong.
      if (!saved.installationAvailable) {
        void message.info(autoReviewChoiceSaved(enabled))
        return
      }
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
        {notice === 'stale' ? (
          <Alert
            // The button is not in the `action` slot, which lays an Alert out as a row beside the
            // text and squeezes it on a narrow screen (see `AutoReviewSwitch`).
            description={
              <Button
                loading={isFetching}
                onClick={() => void refetch({ cancelRefetch: false })}
                ref={trackNoticeRetry}
                size="small"
              >
                Повторить попытку
              </Button>
            }
            key="stale"
            showIcon
            title={STALE_NOTICE}
            type="warning"
          />
        ) : null}
        {notice === 'differs' ? (
          <Alert
            // The button is not in the `action` slot, which lays an Alert out as a row beside the
            // text and squeezes it on a narrow screen (see `AutoReviewSwitch`).
            description={
              <Button disabled={saving} onClick={loadServerValues} ref={loadServerRef} size="small">
                Загрузить значения с сервера
              </Button>
            }
            key="differs"
            showIcon
            title={DIFFERS_NOTICE}
            type="info"
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
          describeError={(err) => formatErrorMessage(err, 'Не удалось сохранить настройки')}
          onCancel={notice === 'differs' ? loadServerValues : undefined}
          onSave={handleSave}
          ref={formRef}
          repository={repository}
        />
        <RulesStatusPanel repoId={repository.id} />
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
        // The button is not in the `action` slot, which lays an Alert out as a row beside the text
        // and squeezes it on a narrow screen (see `AutoReviewSwitch`).
        description={
          <Flex align="flex-start" gap={8} vertical>
            <span>{formatErrorMessage(error, 'Не удалось загрузить репозиторий')}</span>
            <Button
              loading={isFetching}
              onClick={() => void refetch({ cancelRefetch: false })}
              size="small"
              type="primary"
            >
              Повторить попытку
            </Button>
          </Flex>
        }
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
