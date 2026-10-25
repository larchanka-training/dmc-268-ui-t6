import { MockShell, mockStyles as s } from './shell'

/** Repository settings page, English equivalents of src/features/repository-settings/ui/*. */
export function RepositorySettingsMock() {
  return (
    <MockShell
      active="repositories"
      path="/repositories/…/settings"
      caption="Repository settings: auto-review, RAG with index status, review options and the rules file status."
    >
      <div className={s.crumbs}>Repositories / Settings</div>
      <div className={s.header}>
        <div>
          <h3 className={s.title}>Repository settings</h3>
          <p className={s.desc}>acme/api</p>
        </div>
        <span className={s.button}>Review history</span>
      </div>

      <div className={s.card}>
        <div className={s.row}>
          <div>
            <div className={s.label}>Automatic review</div>
            <p className={s.hint}>
              Turns reviews on for this repository. A pull request still needs the ai-review label.
            </p>
          </div>
          <span className={s.switch} data-on />
        </div>
        <div className={s.row}>
          <div>
            <div className={s.label}>RAG</div>
            <p className={s.hint}>
              Builds a code index of the default branch. Only the code structure is stored, not its
              text.
            </p>
          </div>
          <span className={s.switch} data-on />
        </div>
        <div className={s.muted}>
          Index status:{' '}
          <span className={s.tag} data-tone="success">
            Ready
          </span>{' '}
          <span className={s.mono}>3f9c2a1</span> updated 2026-10-20 14:02:11
        </div>
      </div>

      <div className={s.card}>
        <div className={s.grid2}>
          <div className={s.field}>
            <span className={s.label}>CI waiting</span>
            <span className={s.input}>Auto (wait for CI when the commit has checks)</span>
          </div>
          <div className={s.field}>
            <span className={s.label}>Comment limit (1 to 10)</span>
            <span className={s.input}>5</span>
          </div>
          <div className={s.field}>
            <span className={s.label}>Verdict</span>
            <span className={s.input}>Request changes (when blocking)</span>
          </div>
          <div className={s.field}>
            <span className={s.label}>Branch filter</span>
            <span className={`${s.input} ${s.mono}`}>main · release/*</span>
          </div>
        </div>
        <div className={s.field}>
          <span className={s.label}>Severity threshold</span>
          <span className={s.segmented}>
            <span>All</span>
            <span data-active>Warn &amp; Crit</span>
            <span>Only Critical</span>
          </span>
        </div>
        <div className={s.row} style={{ justifyContent: 'flex-start' }}>
          <span className={`${s.button} ${s.primary}`}>Save</span>
          <span className={s.button}>Discard changes</span>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.row}>
          <span className={s.label}>Review rules</span>
          <span className={s.tag} data-tone="success">
            File found
          </span>
        </div>
        <div className={s.muted}>
          <span className={s.mono}>.review/rules.md</span> · main · Checked 2026-10-20 14:01:58
        </div>
      </div>
    </MockShell>
  )
}
