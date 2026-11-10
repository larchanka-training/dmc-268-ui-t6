import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

import { useInView } from '../lib/useInView'
import { useReducedMotion } from '../lib/useReducedMotion'
import { Logo } from './Logo'
import styles from './ReviewDemo.module.css'

/** Шаги демо: PR → анализ → найдена строка → комментарий → suggested fix → вердикт. */
type Stage = 0 | 1 | 2 | 3 | 4 | 5
const FINAL_STAGE: Stage = 5
const TIMELINE: readonly (readonly [Stage, number])[] = [
  [1, 60],
  [2, 450],
  [3, 600],
  [4, 850],
  [5, 1100],
]

type Token = readonly [kind: 'kw' | 'fn' | 'str' | 'ty' | 'pl', text: string]
type LineKind = 'add' | 'del' | 'ctx'
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

const SIGN: Record<LineKind, string> = { add: '+', del: '-', ctx: ' ' }

/**
 * До `open` высота нулевая, потом плавно растёт до содержимого (строки grid 0fr → 1fr): окно не держит
 * пустое место под ещё не появившиеся части.
 */
function Grow({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={styles.grow} data-open={open}>
      <div className={styles.growInner}>{children}</div>
    </div>
  )
}

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

/**
 * Окно ревью в Hero: дифф файла, комментарий ревьюера с предложенной правкой и строка вердикта.
 * Сначала окно компактное (заголовок файла и дифф) и растёт по мере появления комментария, правки и вердикта.
 */
export function ReviewDemo() {
  const reducedMotion = useReducedMotion()
  // Окно видно уже на первом экране, поэтому одного «дифф в кадре» мало: ревью ждёт первого
  // движения вниз, чтобы пользователь увидел его своими глазами, а не пропустил при загрузке.
  const [diffRef, inView] = useInView<HTMLDivElement>('0px 0px -10% 0px')
  // Страница могла открыться уже прокрученной (якорь, возврат назад): тогда ждать нечего.
  const [scrolled, setScrolled] = useState(() => window.scrollY > 0)
  const [animatedStage, setStage] = useState<Stage>(0)
  // Без анимации (reduced motion) окно сразу показывает итоговое состояние.
  const stage = reducedMotion ? FINAL_STAGE : animatedStage

  useEffect(() => {
    if (scrolled) return
    const onScroll = () => {
      setScrolled(true)
    }
    window.addEventListener('scroll', onScroll, { once: true, passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [scrolled])

  useEffect(() => {
    if (!inView || !scrolled || reducedMotion) return
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
  }, [inView, scrolled, reducedMotion])

  return (
    <figure className={styles.figure}>
      <div className={styles.window} data-stage={stage} aria-hidden="true">
        <div className={styles.body}>
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
                    <Grow open={stage >= 3}>
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
                              <code>id</code> comes from the request and goes straight into the
                              query. Pass it as a parameter instead.
                            </p>
                            <Grow open={stage >= 4}>
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
                            </Grow>
                          </div>
                        </div>
                      </div>
                    </Grow>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Grow open={stage >= 5}>
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
                  Solid endpoint, but the query is open to SQL injection. Merge is blocked until
                  it’s fixed.
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
          </Grow>
        </div>
      </div>

      {/* Подпись только для скринридеров: само окно декоративное (aria-hidden). */}
      <figcaption className="visually-hidden">
        Example review: on pull request #142, Reviewer flags a high-severity SQL injection on line
        11 of src/api/users.ts, suggests a parameterized query as the fix, and gives a Blocking
        verdict.
      </figcaption>
    </figure>
  )
}
