import { Logo } from './logo'
import s from './review-preview.module.css'

/**
 * Static picture of what Reviewer adds to a pull request: the label, one inline comment and the
 * check run. Colours follow the --gh-* tokens of landing/src/components/ReviewDemo.module.css.
 */
export function ReviewPreview() {
  return (
    <figure
      className={s.frame}
      aria-label="Example: a Reviewer comment and check on a pull request"
    >
      <div className={s.head}>
        <span className={s.title}>Add user lookup endpoint</span>
        <span className={s.number}>#142</span>
        <span className={s.label}>ai-review</span>
      </div>

      <div className={s.file}>src/api/users.ts</div>
      <div className={s.diff}>
        <div className={s.line} data-add>
          <span>14</span>
          <code>{'+ const sql = `SELECT * FROM users WHERE id = ${id}`'}</code>
        </div>
      </div>

      <div className={s.comment}>
        <div className={s.author}>
          <span className={s.avatar}>
            <Logo size={12} />
          </span>
          <strong>reviewer</strong>
          <span className={s.bot}>bot</span>
          <span className={s.muted}>commented</span>
        </div>
        <div className={s.badges}>
          <span className={s.sev}>High</span>
          <span className={s.cat}>security</span>
        </div>
        <p className={s.ctitle}>SQL injection through string interpolation</p>
        <p className={s.muted}>
          <code>id</code> comes from the request and goes straight into the query. Pass it as a
          parameter instead.
        </p>
      </div>

      <div className={s.check}>
        <span className={s.dot} />
        <strong>AI Review</strong>
        <span className={s.muted}>verdict: blocking · 1 high, 1 low</span>
      </div>
    </figure>
  )
}
