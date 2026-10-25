import { MockShell, mockStyles as s } from './shell'

// Order of a typical run on main (PIPELINE_SPEC section 2): conventions call, then the review call.
const ACTIONS = [
  '#1 policy.load (<1 s)',
  '#2 vcs.fetch_diff (1 s)',
  '#3 context.build (<1 s)',
  '#4 llm.call (6 s)',
  '#5 llm.repo_conventions (<1 s)',
  '#6 context.build (<1 s)',
  '#7 llm.call (14 s)',
  '#8 llm.review_output (<1 s)',
  '#9 review.postprocess (<1 s)',
  '#10 github.publish_review (1 s)',
]

/** Run detail page: stages, the review session (agent trace) and an inline finding. */
export function RunDetailMock() {
  return (
    <MockShell
      active="runs"
      path="/runs/…"
      caption="A finished run: three stages, the step log on the left, the diff with findings on the right."
    >
      <div className={s.crumbs}>Runs / PR #142</div>
      <div className={s.header}>
        <div>
          <h3 className={s.title}>Run for PR #142</h3>
          <p className={s.desc}>Add user lookup endpoint</p>
        </div>
        <span className={`${s.button} ${s.primary}`}>Restart</span>
      </div>

      <div className={s.card}>
        <div className={s.row} style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <span className={s.muted}>Status</span>
          <span className={s.tag} data-tone="success">
            succeeded
          </span>
          <span className={s.tag} data-variant="solid" data-tone="danger">
            Blocking
          </span>
          <span className={s.muted} style={{ marginLeft: 8 }}>
            Findings
          </span>
          <span className={s.tag} data-variant="outline">
            high: 1
          </span>
          <span className={s.tag} data-variant="outline">
            low: 1
          </span>
        </div>
        <div className={s.stages}>
          <div className={s.stage} data-state="done">
            <i />
            Collecting context
          </div>
          <div className={s.stage} data-state="done">
            <i />
            Model analysis
          </div>
          <div className={s.stage} data-state="done">
            <i />
            Publishing
          </div>
        </div>
      </div>

      <div className={s.cols}>
        <div className={s.card}>
          <h4 className={s.h2}>Review session</h4>
          <div className={s.tree}>
            {ACTIONS.map((action) => (
              <div key={action} data-active={action.startsWith('#7 ') || undefined}>
                {action}
              </div>
            ))}
          </div>
          <pre className={s.code}>{'request\n{ "operation": "review", … }'}</pre>
        </div>
        <div className={s.card}>
          <h4 className={s.h2}>Diff and findings</h4>
          <div className={s.mono} style={{ color: 'var(--rv-text-2)' }}>
            src/api/users.ts
          </div>
          <div>
            <div className={s.diffLine} data-add>
              <span>14</span>
              <span>{'+ const sql = `SELECT … WHERE id=${id}`'}</span>
            </div>
            <div className={s.finding}>
              <div className={s.row} style={{ justifyContent: 'flex-start', gap: 8 }}>
                <span className={s.tag} data-tone="danger">
                  High
                </span>
                <strong>SQL injection through string interpolation</strong>
              </div>
              <span className={s.muted}>
                <code className={s.mono}>id</code> comes from the request and goes straight into the
                query. Pass it as a parameter instead.
              </span>
            </div>
            <div className={s.diffLine} data-add>
              <span>15</span>
              <span>+ return db.query(sql)</span>
            </div>
          </div>
        </div>
      </div>
    </MockShell>
  )
}
