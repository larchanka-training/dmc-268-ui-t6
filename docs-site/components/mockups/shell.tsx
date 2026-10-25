import type { ReactNode } from 'react'
import { Logo } from '../logo'
import s from './mockup.module.css'

type Section = 'repositories' | 'runs'

interface ShellProps {
  active: Section
  path: string
  caption: string
  children: ReactNode
}

/**
 * Window frame plus the dashboard sidebar. Labels are English equivalents of
 * src/widgets/app-layout/ui/AppSidebar.tsx (the live dashboard is in Russian for now).
 */
export function MockShell({ active, path, caption, children }: ShellProps) {
  return (
    <figure className="not-prose" aria-label={caption}>
      <div className={s.frame} role="img" aria-label={caption}>
        <div className={s.chrome}>
          <span className={s.lights}>
            <span />
            <span />
            <span />
          </span>
          {path}
        </div>
        <div className={s.body}>
          <aside className={s.sidebar}>
            <div className={s.brand}>
              <Logo size={18} />
              Reviewer
            </div>
            <nav className={s.nav}>
              <span className={s.navItem} data-active={active === 'repositories' || undefined}>
                Repositories
              </span>
              <span className={s.navItem} data-active={active === 'runs' || undefined}>
                Runs
              </span>
            </nav>
          </aside>
          <div className={s.main}>{children}</div>
        </div>
      </div>
      <figcaption className={s.caption}>
        {caption} Labels translated from the Russian dashboard.
      </figcaption>
    </figure>
  )
}

export { s as mockStyles }
