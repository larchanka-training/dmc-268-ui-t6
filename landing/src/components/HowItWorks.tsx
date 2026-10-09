import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'
import styles from './HowItWorks.module.css'

function ConnectVisual() {
  return (
    <div className={styles.visual} aria-hidden="true">
      <div className={styles.repoRow}>
        <span className={styles.checkbox} data-checked="true" />
        acme/api
      </div>
      <div className={styles.repoRow}>
        <span className={styles.checkbox} data-checked="true" />
        acme/web
      </div>
      <div className={styles.repoRow} data-muted="true">
        <span className={styles.checkbox} />
        acme/docs
      </div>
    </div>
  )
}

function PullRequestVisual() {
  return (
    <div className={styles.visual} aria-hidden="true">
      <div className={styles.prRow}>
        <span className={styles.prIcon} />
        <span className={styles.prTitle}>Add user lookup endpoint</span>
        <span className={styles.prNumber}>#142</span>
      </div>
      <div className={styles.progress}>
        <span className={styles.progressBar} />
      </div>
      <p className={styles.progressLabel}>Analyzing changes…</p>
    </div>
  )
}

function FeedbackVisual() {
  return (
    <div className={styles.visual} aria-hidden="true">
      <div className={styles.findingRow}>
        <span className={styles.sevHigh}>High</span>
        SQL injection
      </div>
      <div className={styles.findingRow}>
        <span className={styles.sevLow}>Low</span>
        Unused import
      </div>
      <div className={styles.verdictRow}>
        Verdict <span className={styles.verdictPill}>Blocking</span>
      </div>
    </div>
  )
}

const STEPS = [
  {
    number: '01',
    title: 'Connect GitHub',
    text: 'Sign in with GitHub and connect your repositories.',
    Visual: ConnectVisual,
  },
  {
    number: '02',
    title: 'Open a Pull Request',
    text: 'Reviewer automatically analyzes your code changes.',
    Visual: PullRequestVisual,
  },
  {
    number: '03',
    title: 'Get actionable feedback',
    text: 'See findings, suggested fixes, and a clear review verdict.',
    Visual: FeedbackVisual,
  },
] as const

export function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section} aria-labelledby="how-title">
      <div className="container">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="From pull request to verdict."
        />
        <ol className={styles.steps}>
          {STEPS.map(({ number, title, text, Visual }, index) => (
            <Reveal as="li" key={number} delay={index * 80} className={styles.step}>
              <Visual />
              <span className={styles.number}>{number}</span>
              <h3 className={styles.stepTitle}>{title}</h3>
              <p className={styles.stepText}>{text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
