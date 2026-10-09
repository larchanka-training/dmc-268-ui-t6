import { useState, type PointerEvent, type ReactNode } from 'react'

import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'
import styles from './Features.module.css'

/** Карточка с мягкой подсветкой, следующей за курсором (позиция — CSS-переменные). */
function Card({ children, delay }: { children: ReactNode; delay: number }) {
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--x', `${String(event.clientX - rect.left)}px`)
    event.currentTarget.style.setProperty('--y', `${String(event.clientY - rect.top)}px`)
  }
  return (
    <Reveal as="li" delay={delay} className={styles.cardWrap}>
      <article className={styles.card} onPointerMove={onPointerMove}>
        {children}
      </article>
    </Reveal>
  )
}

function ReviewsVisual() {
  return (
    <div className={styles.visual} aria-hidden="true">
      <div className={styles.severities}>
        <span data-sev="critical">Critical</span>
        <span data-sev="high">High</span>
        <span data-sev="medium">Medium</span>
        <span data-sev="low">Low</span>
      </div>
      <div className={styles.miniComment}>
        <p className={styles.miniTitle}>Missing error handling for async call</p>
        <p className={styles.miniFix}>
          <span>+</span> try {'{'} await sync() {'}'} catch (error) {'{'} … {'}'}
        </p>
      </div>
    </div>
  )
}

const TRACE = [
  ['read_file', 'src/api/users.ts', '0.1s'],
  ['search_code', 'getUser', '0.3s'],
  ['analyze', '1 file changed', '2.4s'],
] as const

function TransparencyVisual() {
  return (
    <div className={styles.visual} aria-hidden="true">
      <ol className={styles.trace}>
        {TRACE.map(([tool, target, time]) => (
          <li key={tool}>
            <span className={styles.traceTool}>{tool}</span>
            <span className={styles.traceTarget}>{target}</span>
            <span className={styles.traceTime}>{time}</span>
          </li>
        ))}
      </ol>
      <div className={styles.budget}>
        <span>12.4k tokens</span>
        <span className={styles.budgetBar}>
          <span />
        </span>
        <span>$0.03</span>
      </div>
    </div>
  )
}

const THRESHOLDS = ['All', 'Warn & Crit', 'Only Critical'] as const
type Threshold = (typeof THRESHOLDS)[number]
const FINDINGS = [
  { sev: 'critical', label: 'Hardcoded secret', level: 2 },
  { sev: 'high', label: 'SQL injection', level: 1 },
  { sev: 'low', label: 'Prefer early return', level: 0 },
] as const
const MIN_LEVEL: Record<Threshold, number> = { All: 0, 'Warn & Crit': 1, 'Only Critical': 2 }

function NoiseVisual() {
  const [threshold, setThreshold] = useState<Threshold>('Warn & Crit')
  const visible = FINDINGS.filter((finding) => finding.level >= MIN_LEVEL[threshold]).length
  return (
    <div className={styles.visual}>
      <div className={styles.segmented} role="radiogroup" aria-label="Severity threshold">
        {THRESHOLDS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={threshold === option}
            className={styles.segment}
            onClick={() => {
              setThreshold(option)
            }}
          >
            {option}
          </button>
        ))}
      </div>
      <ul
        className={styles.filtered}
        aria-live="polite"
        aria-label={`${String(visible)} findings shown`}
      >
        {FINDINGS.map((finding) => (
          <li
            key={finding.label}
            data-hidden={finding.level < MIN_LEVEL[threshold]}
            aria-hidden={finding.level < MIN_LEVEL[threshold]}
          >
            <span className={styles.dot} data-sev={finding.sev} />
            {finding.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MergeVisual() {
  return (
    <div className={styles.visual} aria-hidden="true">
      <div className={styles.mergeRow}>
        <span className={styles.mergeIcon}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div>
          <p className={styles.mergeTitle}>Changes requested</p>
          <p className={styles.mergeText}>reviewer flagged 1 high-severity issue</p>
        </div>
      </div>
      <div className={styles.mergeButton}>Merge pull request</div>
      <p className={styles.mergeNote}>Merging is blocked</p>
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className={styles.section} aria-labelledby="features-title">
      <div className="container">
        <SectionHeading id="features-title" eyebrow="Features" title="Signal, not noise.">
          Reviews that read like a careful teammate, not a wall of nitpicks.
        </SectionHeading>
        <ul className={styles.grid}>
          <Card delay={0}>
            <ReviewsVisual />
            <h3 className={styles.title}>AI-powered reviews</h3>
            <p className={styles.text}>
              Automatic reviews with inline comments, severity levels and suggested fixes.
            </p>
          </Card>
          <Card delay={80}>
            <TransparencyVisual />
            <h3 className={styles.title}>Full transparency</h3>
            <p className={styles.text}>
              See every step of the AI analysis, review details, token usage and cost.
            </p>
          </Card>
          <Card delay={0}>
            <NoiseVisual />
            <h3 className={styles.title}>Less noise, more signal</h3>
            <p className={styles.text}>
              Control severity thresholds, comment limits and review behavior.
            </p>
          </Card>
          <Card delay={80}>
            <MergeVisual />
            <h3 className={styles.title}>Merge protection</h3>
            <p className={styles.text}>Request changes when important issues are detected.</p>
          </Card>
        </ul>
      </div>
    </section>
  )
}
