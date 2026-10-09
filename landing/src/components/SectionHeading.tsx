import type { ReactNode } from 'react'

import { Reveal } from './Reveal'
import styles from './SectionHeading.module.css'

interface SectionHeadingProps {
  id: string
  eyebrow: string
  title: ReactNode
  children?: ReactNode
}

export function SectionHeading({ id, eyebrow, title, children }: SectionHeadingProps) {
  return (
    <Reveal className={styles.heading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      {children !== undefined && <p className={styles.lead}>{children}</p>}
    </Reveal>
  )
}
