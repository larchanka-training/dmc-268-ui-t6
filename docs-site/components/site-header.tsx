'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { useSearchContext } from 'fumadocs-ui/contexts/search'
import { appName, appUrl } from '@/lib/shared'
import { Logo } from './logo'
import styles from './site-header.module.css'

/** Docs header: logo, search (Ctrl K) and a link to the dashboard. */
export function SiteHeader() {
  const { setOpenSearch } = useSearchContext()

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} aria-label={`${appName} docs home`}>
          <Logo size={20} />
          <span>{appName}</span>
          <span className={styles.pill}>Docs</span>
        </Link>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.search}
            onClick={() => {
              setOpenSearch(true)
            }}
            aria-label="Search the docs"
          >
            <Search className="size-4" aria-hidden />
            <span>Search</span>
            <kbd>Ctrl K</kbd>
          </button>
          <a href={appUrl} className={styles.button} target="_blank" rel="noreferrer">
            Open dashboard
          </a>
        </div>
      </div>
    </header>
  )
}
