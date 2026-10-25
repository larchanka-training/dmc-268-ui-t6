import { MockShell, mockStyles as s } from './shell'

const RUNS = [
  { pr: 142, title: 'Add user lookup endpoint', status: 'running', tone: 'info', active: true },
  { pr: 141, title: 'fix: close the db session on cancel', status: 'succeeded', tone: 'success' },
  { pr: 139, title: 'refactor: split the webhook handler', status: 'failed', tone: 'danger' },
  { pr: 138, title: 'feat: paginate the runs list', status: 'cancelled', tone: 'warning' },
  { pr: 137, title: 'chore: bump the fastapi pin', status: 'skipped', tone: 'neutral' },
] as const

/** Runs list, English equivalent of src/pages/runs/RunsPage.tsx.
 * The Engine column is left out: only one engine exists today. */
export function RunsListMock() {
  return (
    <MockShell
      active="runs"
      path="/runs"
      caption="The runs list. Status values are shown as the raw API names."
    >
      <div className={s.header}>
        <div>
          <h3 className={s.title}>Runs</h3>
          <p className={s.desc}>Pull requests that were reviewed or are being reviewed</p>
        </div>
        <span className={s.button}>Refresh</span>
      </div>
      <div className={s.card} style={{ padding: 0 }}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>PR</th>
              <th>Repository</th>
              <th>Review status</th>
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
                        in progress
                      </span>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MockShell>
  )
}
