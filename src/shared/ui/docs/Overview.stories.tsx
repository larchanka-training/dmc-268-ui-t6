import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Radio,
  Segmented,
  Select,
  Skeleton,
  Spin,
  Switch,
  type TableColumnsType,
} from 'antd'
import type { JSX } from 'react'

import { DataTable } from '../DataTable/DataTable'
import { Logo } from '../Logo/Logo'
import { PageHeader } from '../PageHeader/PageHeader'
import { Tag } from '../Tag/Tag'
import styles from './Overview.module.css'

// The rules page of this Storybook and the specification, which lives only in the repository.
const RULES_URL = './?path=/docs/правила--docs'
const SPEC_URL =
  'https://github.com/larchanka-training/dmc-268-ui-t6/blob/main/docs/DESIGN_SYSTEM.md'

const SURFACES = [
  ['--rv-bg', 'Фон страницы'],
  ['--rv-bg-raised', 'Приподнятый фон'],
  ['--rv-surface', 'Поверхность'],
  ['--rv-surface-3', 'Выбранная поверхность'],
  ['--rv-border-strong', 'Рамка'],
  ['--rv-text', 'Текст'],
  ['--rv-text-2', 'Текст вторичный'],
  ['--rv-text-3', 'Текст третичный'],
] as const

const SIGNALS = [
  ['--rv-accent', 'Акцент'],
  ['--rv-accent-hover', 'Акцент hover'],
  ['--rv-link', 'Ссылка и фокус'],
  ['--rv-success', 'Успех'],
  ['--rv-warning', 'Medium'],
  ['--rv-high', 'High'],
  ['--rv-critical', 'Critical'],
  ['--rv-danger', 'Ошибка'],
] as const

interface Row {
  id: number
  title: string
  status: 'running' | 'succeeded' | 'failed'
  critical: number
}

const ROWS: Row[] = [
  { id: 32, title: 'feat: refactor diff viewer', status: 'running', critical: 0 },
  { id: 34, title: 'feat: frontend architecture skeleton', status: 'succeeded', critical: 1 },
  { id: 35, title: 'feat: add timeout handling', status: 'failed', critical: 0 },
]

const TONE = { running: 'info', succeeded: 'success', failed: 'danger' } as const

const COLUMNS: TableColumnsType<Row> = [
  { title: 'PR', key: 'pr', render: (_, row) => `#${String(row.id)} ${row.title}` },
  { title: 'Репозиторий', key: 'repo', render: () => 'larchanka-training/dmc-268-ui-t6' },
  {
    title: 'Статус ревью',
    key: 'status',
    render: (_, row) => (
      <Tag pulse={row.status === 'running'} tone={TONE[row.status]}>
        {row.status}
      </Tag>
    ),
  },
  {
    title: 'Находки',
    key: 'findings',
    render: (_, row) =>
      row.critical > 0 ? (
        <Tag tone="critical" variant="solid">
          {`critical ${String(row.critical)}`}
        </Tag>
      ) : (
        <span style={{ color: 'var(--rv-text-2)' }}>нет</span>
      ),
  },
]

function Swatches(props: { tokens: readonly (readonly [string, string])[] }): JSX.Element {
  return (
    <div className={styles.swatches}>
      {props.tokens.map(([token, label]) => (
        <div className={styles.swatch} key={token}>
          <span className={styles.chip} style={{ background: `var(${token})` }} />
          <strong>{label}</strong>
          <code>{token}</code>
        </div>
      ))}
    </div>
  )
}

function Overview(): JSX.Element {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Reviewer UI</h1>
        <p className={styles.lead}>
          Дизайн-система Reviewer для интерфейсов приложения. Построена на Ant Design.
        </p>
        <nav aria-label="Документы" className={styles.links}>
          <a className={styles.link} href={RULES_URL} target="_top">
            Правила применения
          </a>
          <a className={styles.link} href={SPEC_URL} rel="noreferrer" target="_blank">
            Спецификация (docs/DESIGN_SYSTEM.md)
          </a>
        </nav>
      </header>

      <section className={styles.section}>
        <h2 className={styles.heading}>Цвет</h2>
        <p className={styles.label}>Поверхности и текст</p>
        <Swatches tokens={SURFACES} />
        <p className={styles.label}>Акцент и состояния</p>
        <Swatches tokens={SIGNALS} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Типографика</h2>
        <div className={styles.type}>
          <div className={styles.typeRow}>
            <span className={styles.typeMeta}>Заголовок страницы, 24 / 600</span>
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
              Прогоны AI Review
            </span>
          </div>
          <div className={styles.typeRow}>
            <span className={styles.typeMeta}>Заголовок блока, 15 / 600</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Подключенные репозитории</span>
          </div>
          <div className={styles.typeRow}>
            <span className={styles.typeMeta}>Текст, 13 / 400</span>
            <span>Ревью запускается по метке ai-review и успешному CI.</span>
          </div>
          <div className={styles.typeRow}>
            <span className={styles.typeMeta}>Мелкий, 12 / 400</span>
            <span style={{ color: 'var(--rv-text-2)', fontSize: 'var(--rv-fs-xs)' }}>
              Обновлено 2 минуты назад
            </span>
          </div>
          <div className={styles.typeRow}>
            <span className={styles.typeMeta}>Код, 12, JetBrains Mono</span>
            <code className={styles.mono}>src/webhooks/retry.ts:42</code>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Логотип</h2>
        <div className={styles.logos}>
          <Logo size={64} title="Reviewer" />
          <Logo size={40} />
          <Logo size={24} />
          <Logo size={16} />
          <span className={styles.lockupLarge}>
            <Logo size={32} />
            Reviewer
          </span>
          <span className={styles.lockup}>
            <Logo size={20} />
            Reviewer
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Компоненты</h2>
        <div className={styles.grid}>
          <div className={styles.group}>
            <p className={styles.label}>Кнопки</p>
            <div className={styles.row}>
              <Button icon={<PlusOutlined />} type="primary">
                Подключить
              </Button>
              <Button icon={<ReloadOutlined />}>Обновить</Button>
              <Button type="text">Отмена</Button>
              <Button danger>Остановить</Button>
            </div>
            <div className={styles.row}>
              <Button loading type="primary">
                Сохраняем
              </Button>
              <Button disabled>Недоступно</Button>
              <Button size="small">Настроить</Button>
            </div>

            <p className={styles.label}>Теги</p>
            <div className={styles.row}>
              <Tag>queued</Tag>
              <Tag pulse tone="info">
                running
              </Tag>
              <Tag tone="success">succeeded</Tag>
              <Tag tone="danger">failed</Tag>
            </div>
            <div className={styles.row}>
              <Tag tone="critical" variant="solid">
                critical
              </Tag>
              <Tag tone="high">high</Tag>
              <Tag tone="warning">medium</Tag>
              <Tag variant="outline">main</Tag>
            </div>

            <p className={styles.label}>Выбор</p>
            <div className={styles.row}>
              <Switch aria-label="Ревью включено" defaultChecked />
              <Switch aria-label="Ждать CI" />
              <Checkbox defaultChecked>Критичные</Checkbox>
              <Checkbox>Low</Checkbox>
            </div>
            <div>
              <Segmented
                defaultValue="all"
                options={[
                  { value: 'all', label: 'Все (12)' },
                  { value: 'active', label: 'Активные (7)' },
                ]}
              />
            </div>
            <Radio.Group
              defaultValue="COMMENT"
              options={[
                { value: 'COMMENT', label: 'Комментарий' },
                { value: 'REQUEST_CHANGES', label: 'Запрос изменений' },
              ]}
            />
          </div>

          <div className={styles.group}>
            <p className={styles.label}>Поля</p>
            <div className={styles.stack}>
              <Input placeholder="Поиск по названию..." prefix={<SearchOutlined />} />
              <Select
                defaultValue="auto"
                options={[
                  { value: 'auto', label: 'Авто (ожидать CI при наличии проверок)' },
                  { value: 'always', label: 'Всегда (всегда ждать успешного CI)' },
                ]}
              />
              <Input defaultValue="14" status="error" />
            </div>

            <p className={styles.label}>Сообщения и загрузка</p>
            <div className={styles.stack}>
              <Alert
                description="Показаны первые 40 файлов из 112."
                showIcon
                title="Дифф слишком большой"
                type="warning"
              />
              <div className={styles.row}>
                <Spin />
                <div style={{ flex: 1 }}>
                  <Skeleton active paragraph={{ rows: 1 }} title={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Страница</h2>
        <PageHeader
          actions={
            <Button icon={<ReloadOutlined />} type="primary">
              Обновить
            </Button>
          }
          description="Pull request'ы, по которым выполнялось или выполняется ревью"
          title="Прогоны"
        />
        <DataTable<Row> columns={COLUMNS} dataSource={ROWS} rowKey="id" />
      </section>

      <footer className={styles.row} style={{ color: 'var(--rv-text-2)' }}>
        <Logo size={18} />
        Reviewer
      </footer>
    </div>
  )
}

const meta: Meta<typeof Overview> = {
  title: 'Reviewer UI',
  component: Overview,
  // A page, not a component: no addon panel (controls, actions, interactions) under it.
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    actions: { disable: true },
    interactions: { disable: true },
  },
}

export default meta

// One story named like the component: Storybook shows it as a single entry, not as a folder.
export const ReviewerUi: StoryObj<typeof Overview> = { name: 'Reviewer UI' }
