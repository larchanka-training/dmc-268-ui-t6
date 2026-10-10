import { HeroGlass } from './HeroGlass'
import { ReviewDemo } from './ReviewDemo'
import { cx } from '../lib/cx'
import styles from './Hero.module.css'

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.backdrop} aria-hidden="true">
        <HeroGlass textSelector="#hero-text" />
        <div className={styles.grain} />
        <div className={styles.fade} />
      </div>

      <div id="hero-text" className={cx('container', styles.content)}>
        <h1 id="hero-title" className={styles.title}>
          Less reviewing.
          <br />
          More shipping.
        </h1>
        <p className={styles.subtitle}>
          Your code, your rules. Let AI handle the reviews while you focus on building.
        </p>
        <a href="#waitlist" className={styles.cta}>
          Get early access
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8h10m0 0L9 4m4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>

      <div className={cx('container', styles.demoWrap)}>
        <div className={styles.demoGlow} aria-hidden="true" />
        <div className={styles.demo}>
          <ReviewDemo />
        </div>
      </div>
    </section>
  )
}
