import { getAppUrl } from '../lib/appUrl'
import { Dither } from './Dither'
import { Reveal } from './Reveal'
import styles from './Ending.module.css'

/** Открытая концовка без панели и рамки: крупный заголовок над мягкими пиксельными полями в углах. */
export function Ending() {
  return (
    <section className={styles.section} aria-labelledby="ending-title">
      <div className={styles.field} aria-hidden="true">
        <Dither />
      </div>
      <Reveal className={styles.inner}>
        <h2 id="ending-title" className={styles.title}>
          Be first to review smarter.
        </h2>
        <p className={styles.lead}>
          Connect your GitHub repo and get your first AI review in minutes.
        </p>
        <a href={getAppUrl()} className={styles.cta}>
          Try it now
        </a>
        <p className={styles.note}>Early access (EAP)</p>
      </Reveal>
    </section>
  )
}
