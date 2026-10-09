import { BRAND_NAME } from '../brand'
import { Logo } from './Logo'
import { cx } from '../lib/cx'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={cx('container', styles.inner)}>
        <a href="#top" className={styles.brand} aria-label={`${BRAND_NAME}, back to top`}>
          <Logo size={18} />
          <span>{BRAND_NAME}</span>
        </a>
        <p className={styles.copy}>
          © {new Date().getFullYear()} {BRAND_NAME}
        </p>
      </div>
    </footer>
  )
}
