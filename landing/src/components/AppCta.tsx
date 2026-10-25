import { getAppUrl } from '../lib/appUrl'
import { Reveal } from './Reveal'
import styles from './AppCta.module.css'

export function AppCta() {
  return (
    <section className={styles.section} aria-labelledby="app-cta-title">
      <div className="container">
        <Reveal className={styles.panel}>
          <div className={styles.glow} aria-hidden="true" />
          <h2 id="app-cta-title" className={styles.title}>
            Be first to review smarter.
          </h2>
          <p className={styles.lead}>
            Connect your GitHub repo and get your first AI review in minutes.
          </p>
          <a href={getAppUrl()} className={styles.button}>
            Try it now
          </a>
          <p className={styles.note}>Early access (EAP)</p>
        </Reveal>
      </div>
    </section>
  )
}
