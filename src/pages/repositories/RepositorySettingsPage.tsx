import { RightOutlined } from '@ant-design/icons'
import { Alert, App, Breadcrumb, Button, Empty, Flex, Skeleton } from 'antd'
import type { FC, ReactNode } from 'react'
import { Link, useHref, useLinkClickHandler, useParams } from 'react-router'

import {
  RepositoryIdSchema,
  useRepository,
  useUpdateRepository,
  type Repository,
  type UpdateRepositoryInput,
} from '../../entities/repository'
import { runListHref } from '../../features/run-list-filter'
import { RepositorySettingsForm } from '../../features/repository-settings'
import { PageHeader } from '../../shared/ui'
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

  // A repository that is on screen stays on screen: a failed background refetch keeps `data`
  // and must not unmount the form with the typed values.
  if (repository !== undefined) {
    const handleSave = async (patch: UpdateRepositoryInput): Promise<Repository> => {
      const saved = await updateMutation.mutateAsync({ id: repository.id, patch })
      void message.success('Настройки репозитория успешно сохранены')
      return saved
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
        <RepositorySettingsForm
          describeError={(err) => formatErrorMessage(err, 'Не удалось сохранить настройки')}
          onSave={handleSave}
          repository={repository}
        />
      </Flex>
    )
  }

  if (isPending) {
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
