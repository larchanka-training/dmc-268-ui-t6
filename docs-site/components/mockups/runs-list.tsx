import { MockShell, mockStyles as s } from './shell'

const RUNS = [
  { pr: 142, title: 'Add user lookup endpoint', status: 'running', tone: 'info', active: true },
  { pr: 141, title: 'fix: close the db session on cancel', status: 'succeeded', tone: 'success' },
  { pr: 139, title: 'refactor: split the webhook handler', status: 'failed', tone: 'danger' },
  { pr: 138, title: 'feat: paginate the runs list', status: 'cancelled', tone: 'warning' },
  { pr: 137, title: 'chore: bump the fastapi pin', status: 'skipped', tone: 'neutral' },
] as const

/** Runs list, columns and status tags from src/pages/runs/RunsPage.tsx. */
export function RunsListMock() {
  return (
    <MockShell
      active="runs"
      path="/runs"
      caption="The runs list. Status values are shown as the raw API names."
    >
      <div className={s.header}>
        <div>
          <h3 className={s.title}>Прогоны</h3>
          <p className={s.desc}>
            Pull request&apos;ы, по которым выполнялось или выполняется ревью
          </p>
        </div>
        <span className={s.button}>Обновить</span>
      </div>
      <div className={s.card} style={{ padding: 0 }}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>PR</th>
              <th>Репозиторий</th>
              <th>Статус ревью</th>
              <th>Движок</th>
            </tr>
          </thead>
          <tbody>
            {RUNS.map((run) => (
              <tr key={run.pr}>
                <td>
                  <span className={s.link}>#{run.pr}</span>{' '}
                  <span className={s.muted}>{run.title}</span>
                </td>
                <td>acme/api</td>
                <td>
                  <span
                    className={s.tag}
                    data-tone={run.tone}
                    data-pulse={'active' in run || undefined}
                  >
                    {run.status}
                  </span>
                  {'active' in run ? (
                    <>
                      {' '}
                      <span className={s.tag} data-variant="outline">
                        в процессе
                      </span>
                    </>
                  ) : null}
                </td>
                <td className={s.muted}>fast</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MockShell>
  )
}
