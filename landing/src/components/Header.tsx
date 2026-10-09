import { useEffect, useState } from 'react'

import { BRAND_NAME } from '../brand'
import { Logo } from './Logo'
import styles from './Header.module.css'

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <header className={styles.header} data-scrolled={scrolled}>
      <div className={styles.bar}>
        <a href="#top" className={styles.brand} aria-label={`${BRAND_NAME} home`}>
          <Logo size={20} />
          <span>{BRAND_NAME}</span>
        </a>
        <nav aria-label="Primary" className={styles.nav}>
          <a href="#how-it-works" className={styles.link}>
            How it works
          </a>
          <a href="#features" className={styles.link}>
            Features
          </a>
          <a href="#waitlist" className={styles.link}>
            Get early access
          </a>
        </nav>
      </div>
    </header>
  )
}
