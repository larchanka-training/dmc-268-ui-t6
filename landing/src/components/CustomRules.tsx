import { useInView } from '../lib/useInView'
import { Reveal } from './Reveal'
import { cx } from '../lib/cx'
import styles from './CustomRules.module.css'

const RULES_FILE: readonly { kind: 'heading' | 'item' | 'blank'; text: string }[] = [
  { kind: 'heading', text: 'Review Rules' },
  { kind: 'blank', text: '' },
  { kind: 'item', text: 'Flag potential security vulnerabilities' },
  { kind: 'item', text: 'Prefer early returns' },
  { kind: 'item', text: 'Avoid unnecessary database queries' },
  { kind: 'item', text: 'Require error handling for async operations' },
]

const BENEFITS = [
  'Lives in your repository, next to your code',
  'Versioned and reviewed like any other change',
  'Your team owns the review standards',
  'Applied by the AI on every review',
]

export function CustomRules() {
  const [ref, inView] = useInView<HTMLDivElement>()

  return (
    <section className={styles.section} aria-labelledby="rules-title">
      <div className={cx('container', styles.layout)}>
        <Reveal className={styles.copy}>
          <p className={styles.eyebrow}>
            Custom rules <span className={styles.soon}>Coming soon</span>
          </p>
          <h2 id="rules-title" className={styles.title}>
            Your rules. Your codebase.
          </h2>
          <p className={styles.lead}>
            Define your team’s review standards directly in your repository. Versioned with your
            code, applied to every review.
          </p>
          <ul className={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <li key={benefit}>
                <span className={styles.bullet} aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120} className={styles.editorWrap}>
          <div className={styles.editorGlow} aria-hidden="true" />
          <div ref={ref} className={styles.editor} data-typing={inView}>
            <div className={styles.tabs}>
              <span className={styles.tab}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 1.5h6l3 3v10h-9z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
                .review/rules.md
              </span>
            </div>
            <pre className={styles.code} aria-label="Contents of .review/rules.md">
              {RULES_FILE.map((line, index) => (
                <span
                  key={index}
                  className={styles.line}
                  style={{ animationDelay: `${String(200 + index * 140)}ms` }}
                >
                  <span className={styles.lineNo} aria-hidden="true">
                    {index + 1}
                  </span>
                  {line.kind === 'heading' && (
                    <>
                      <span className={styles.mdMark}># </span>
                      <span className={styles.mdHeading}>{line.text}</span>
                    </>
                  )}
                  {line.kind === 'item' && (
                    <>
                      <span className={styles.mdMark}>- </span>
                      <span className={styles.mdText}>{line.text}</span>
                    </>
                  )}
                  {'\n'}
                </span>
              ))}
            </pre>
            <div className={styles.statusBar}>
              <span>
                <span className={styles.branchDot} aria-hidden="true" />
                main
              </span>
              <span>Markdown</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
