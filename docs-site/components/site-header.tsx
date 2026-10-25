'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { appName, appUrl, landingUrl } from '@/lib/shared'
import { Logo } from './logo'
import styles from './site-header.module.css'

/**
 * The landing header (landing/src/components/Header.tsx) with a "Docs" item. Landing items link
 * back to the landing sections, "Try it now" opens the dashboard.
 */
export function SiteHeader() {
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
        <a href={`${landingUrl}/`} className={styles.brand} aria-label={`${appName} home`}>
          <Logo size={20} />
          <span>{appName}</span>
        </a>
        <nav aria-label="Primary" className={styles.nav}>
          <a href={`${landingUrl}/#how-it-works`} className={styles.link} data-landing>
            How it works
          </a>
          <a href={`${landingUrl}/#features`} className={styles.link} data-landing>
            Features
          </a>
          <Link href="/docs" className={styles.link} aria-current="page">
            Docs
          </Link>
          <a href={appUrl} className={styles.link}>
            Try it now
          </a>
        </nav>
      </div>
    </header>
  )
}
