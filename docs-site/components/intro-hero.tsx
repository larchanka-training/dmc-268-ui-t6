import type { ReactNode } from 'react'
import { HeroGlass } from './hero-glass'
import s from './intro-hero.module.css'

/**
 * Top of the Introduction page: the landing's glass strips, faint and faded out, behind the title
 * and description only. Absolutely positioned, so it never shifts the layout.
 */
export function IntroHero({ children }: { children: ReactNode }) {
  return (
    <div className={s.hero}>
      <div className={s.glass} aria-hidden>
        <HeroGlass textSelector="#intro-hero-text" />
      </div>
      <div id="intro-hero-text">{children}</div>
    </div>
  )
}
