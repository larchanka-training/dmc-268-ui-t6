import { useCallback, useEffect, useState, type CSSProperties } from 'react'

import { useInView } from '../lib/useInView'
import { useReducedMotion } from '../lib/useReducedMotion'
import { Logo } from './Logo'
import styles from './ReviewDemo.module.css'

/** Шаги демо: PR → анализ → найдена строка → комментарий → suggested fix → вердикт. */
type Stage = 0 | 1 | 2 | 3 | 4 | 5
const FINAL_STAGE: Stage = 5
const TIMELINE: readonly (readonly [Stage, number])[] = [
  [1, 70],
  [2, 480],
  [3, 590],
  [4, 790],
  [5, 1000],
]

type Token = readonly [kind: 'kw' | 'fn' | 'str' | 'ty' | 'pl', text: string]
type LineKind = 'ctx' | 'add' | 'del'
interface DiffLine {
  kind: LineKind
  oldNo: number | null
  newNo: number | null
  tokens: readonly Token[]
  flagged?: boolean
}

const DIFF: readonly DiffLine[] = [
  {
    kind: 'ctx',
    oldNo: 8,
    newNo: 8,
    tokens: [
      ['kw', 'import'],
      ['pl', ' { db } '],
      ['kw', 'from'],
      ['str', " '../db'"],
    ],
  },
  { kind: 'ctx', oldNo: 9, newNo: 9, tokens: [] },
  {
    kind: 'del',
    oldNo: 10,
    newNo: null,
    tokens: [
      ['kw', 'export function'],
      ['fn', ' getUser'],
      ['pl', '(id) {'],
    ],
  },
  {
    kind: 'del',
    oldNo: 11,
    newNo: null,
    tokens: [
      ['kw', '  return'],
      ['pl', ' db.users.'],
      ['fn', 'find'],
      ['pl', '(id)'],
    ],
  },
  {
    kind: 'add',
    oldNo: null,
    newNo: 10,
    tokens: [
      ['kw', 'export async function'],
      ['fn', ' getUser'],
      ['pl', '(id: '],
      ['ty', 'string'],
      ['pl', ') {'],
    ],
  },
  {
    kind: 'add',
    oldNo: null,
    newNo: 11,
    flagged: true,
    tokens: [
      ['kw', '  const'],
      ['pl', ' sql = '],
      ['str', "`SELECT * FROM users WHERE id = '${id}'`"],
    ],
  },
  {
    kind: 'add',
    oldNo: null,
    newNo: 12,
    tokens: [
      ['kw', '  const'],
      ['pl', ' [user] = '],
      ['kw', 'await'],
      ['pl', ' db.'],
      ['fn', 'query'],
      ['pl', '(sql)'],
    ],
  },
  {
    kind: 'add',
    oldNo: null,
    newNo: 13,
    tokens: [
      ['kw', '  return'],
      ['pl', ' user ?? '],
      ['kw', 'null'],
    ],
  },
  { kind: 'ctx', oldNo: 12, newNo: 14, tokens: [['pl', '}']] },
]

const FIX: readonly { kind: LineKind; tokens: readonly Token[] }[] = [
  {
    kind: 'del',
    tokens: [
      ['kw', 'const'],
      ['pl', ' sql = '],
      ['str', "`SELECT * FROM users WHERE id = '${id}'`"],
    ],
  },
  {
    kind: 'del',
    tokens: [
      ['kw', 'const'],
      ['pl', ' [user] = '],
      ['kw', 'await'],
      ['pl', ' db.'],
      ['fn', 'query'],
      ['pl', '(sql)'],
    ],
  },
  {
    kind: 'add',
    tokens: [
      ['kw', 'const'],
      ['pl', ' [user] = '],
      ['kw', 'await'],
      ['pl', ' db.'],
      ['fn', 'query'],
      ['pl', '('],
      ['str', "'SELECT * FROM users WHERE id = $1'"],
      ['pl', ', [id])'],
    ],
  },
]

const SIGN: Record<LineKind, string> = { ctx: ' ', add: '+', del: '-' }

function Code({ tokens }: { tokens: readonly Token[] }) {
  return (
    <>
      {tokens.map(([kind, text], index) => (
        <span key={index} className={styles[kind]}>
          {text}
        </span>
      ))}
    </>
  )
}

export function ReviewDemo() {
  const reducedMotion = useReducedMotion()
  // Демо стартует не при открытии страницы, а когда сам код доскроллен до середины экрана:
  // наблюдаем за диффом, и он должен подняться выше нижних 45% вьюпорта.
  const [diffRef, inView] = useInView<HTMLDivElement>('0px 0px -45% 0px')
  const [animatedStage, setStage] = useState<Stage>(0)
  const [run, setRun] = useState(0)
  // Без анимации (reduced motion) окно сразу показывает итоговое состояние.
  const stage = reducedMotion ? FINAL_STAGE : animatedStage

  useEffect(() => {
    if (!inView || reducedMotion) return
    const timers = TIMELINE.map(([next, at]) =>
      window.setTimeout(() => {
        setStage(next)
      }, at),
    )
    return () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer)
      })
    }
  }, [inView, reducedMotion, run])

  const replay = useCallback(() => {
    setStage(0)
    setRun((value) => value + 1)
  }, [])

  const done = stage === FINAL_STAGE
  // Спиннер крутится с самого открытия страницы: до старта демо окно уже «в работе».
  const statusText = done ? 'Review complete' : 'Reviewing changes'

  return (
    <figure className={styles.figure}>
      <div className={styles.window} data-stage={stage} aria-hidden="true">
        <div className={styles.chrome}>
          <span className={styles.dots}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.url}>github.com/acme/api/pull/142/files</span>
        </div>

        <div className={styles.repoBar}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
          </svg>
          <span>
            acme / <b>api</b>
          </span>
        </div>

        <div className={styles.prHeader}>
          <p className={styles.prTitle}>
            Add user lookup endpoint <span className={styles.prNumber}>#142</span>
          </p>
          <p className={styles.prMeta}>
            <span className={styles.openPill}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
              </svg>
              Open
            </span>
            <span className={styles.prMetaText}>
              <b>maria</b> wants to merge 3 commits into <code>main</code> from{' '}
              <code>feat/user-lookup</code>
            </span>
          </p>
          <div className={styles.tabs}>
            <span>
              Conversation <i className={styles.counter}>0</i>
            </span>
            <span className={styles.tabOptional}>
              Commits <i className={styles.counter}>3</i>
            </span>
            <span className={styles.tabOptional}>
              Checks <i className={styles.counter}>1</i>
            </span>
            <span className={styles.tabActive}>
              Files changed <i className={styles.counter}>1</i>
            </span>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.status} data-done={done}>
            <span className={styles.avatar}>
              <Logo size={12} />
            </span>
            <b>reviewer</b>
            <span className={styles.botTag}>bot</span>
            <span className={styles.statusText}>
              {!done && <span className={styles.spinner} />}
              {statusText}
              {done && <span className={styles.statusMeta}> · 1 file · 38s</span>}
            </span>
          </div>

          <div className={styles.file}>
            <div className={styles.fileHeader}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
              </svg>
              <span className={styles.fileStats}>
                <span className={styles.statAdd}>+4</span>
                <span className={styles.statDel}>−2</span>
                <span className={styles.diffstat}>
                  <i data-kind="add" />
                  <i data-kind="add" />
                  <i data-kind="add" />
                  <i data-kind="del" />
                  <i data-kind="del" />
                </span>
              </span>
              <span className={styles.fileName}>src/api/users.ts</span>
            </div>

            <div ref={diffRef} className={styles.diff}>
              <div className={styles.hunk}>
                <span className={styles.hunkGutter} />
                <code>
                  @@ -8,5 +8,7 @@ import {'{'} db {'}'} from &apos;../db&apos;
                </code>
              </div>
              {DIFF.map((line, index) => (
                <div key={index}>
                  <div
                    className={styles.line}
                    data-kind={line.kind}
                    data-flagged={line.flagged === true ? 'true' : undefined}
                    style={{ '--i': index } as CSSProperties}
                  >
                    <span className={styles.lineNo}>{line.oldNo ?? ''}</span>
                    <span className={styles.lineNo}>{line.newNo ?? ''}</span>
                    <code className={styles.code}>
                      <span className={styles.sign}>{SIGN[line.kind]}</span>
                      <Code tokens={line.tokens} />
                    </code>
                  </div>

                  {line.flagged === true && (
                    <div className={styles.thread}>
                      <div className={styles.comment}>
                        <div className={styles.commentHead}>
                          <span className={styles.avatar}>
                            <Logo size={12} />
                          </span>
                          <b>reviewer</b>
                          <span className={styles.botTag}>bot</span>
                          <span className={styles.commentTime}>commented now</span>
                          <span className={styles.badges}>
                            <span className={styles.badgeHigh}>High</span>
                            <span className={styles.badgeCategory}>Security</span>
                          </span>
                        </div>
                        <div className={styles.commentBody}>
                          <p className={styles.commentTitle}>
                            SQL injection through string interpolation
                          </p>
                          <p className={styles.commentText}>
                            <code>id</code> comes from the request and goes straight into the query.
                            Pass it as a parameter instead.
                          </p>
                          <div className={styles.fix}>
                            <div className={styles.fixHead}>Suggested change</div>
                            {FIX.map((fixLine, fixIndex) => (
                              <div
                                key={fixIndex}
                                className={styles.fixLine}
                                data-kind={fixLine.kind}
                              >
                                <code className={styles.code}>
                                  <span className={styles.sign}>{SIGN[fixLine.kind]}</span>
                                  <Code tokens={fixLine.tokens} />
                                </code>
                              </div>
                            ))}
                            <div className={styles.fixFoot}>
                              <span className={styles.fixButton}>Commit suggestion</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.verdict}>
            <div className={styles.verdictHead}>
              <span className={styles.verdictIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073ZM8 3.25a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0V7h-1.5a.75.75 0 0 1 0-1.5h1.5V4A.75.75 0 0 1 8 3.25Zm-3 8a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
                </svg>
              </span>
              <span>
                <b>reviewer</b> requested changes
              </span>
              <span className={styles.verdictScale}>
                <span className={styles.verdictBlocking}>Blocking</span>
                <span>Needs attention</span>
                <span>Clean</span>
              </span>
            </div>
            <div className={styles.verdictBody}>
              <p className={styles.verdictText}>
                Solid endpoint, but the query is open to SQL injection. Merge is blocked until it’s
                fixed.
              </p>
              <div className={styles.verdictMeta}>
                <span>
                  <i className={styles.dotHigh} />1 high
                </span>
                <span>
                  <i className={styles.dotLow} />1 low
                </span>
                <span>Effort: small</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <figcaption className={styles.caption}>
        <span className="visually-hidden">
          Example review: on pull request #142, Reviewer flags a high-severity SQL injection on line
          11 of src/api/users.ts, suggests a parameterized query as the fix, and gives a Blocking
          verdict.
        </span>
        {!reducedMotion && (
          <button
            type="button"
            className={styles.replay}
            onClick={replay}
            disabled={!done}
            aria-label="Replay the review demo"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v2.6h2.6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Replay
          </button>
        )}
      </figcaption>
    </figure>
  )
}
