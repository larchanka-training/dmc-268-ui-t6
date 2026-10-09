import type { CSSProperties, ElementType, ReactNode } from 'react'

import { useInView } from '../lib/useInView'

interface RevealProps {
  children: ReactNode
  as?: ElementType
  delay?: number
  className?: string
}

/** Плавное появление блока при первом входе во вьюпорт (стили — `[data-reveal]` в global.css). */
export function Reveal({ children, as: Tag = 'div', delay = 0, className }: RevealProps) {
  const [ref, inView] = useInView<HTMLElement>()
  const style = { '--reveal-delay': `${String(delay)}ms` } as CSSProperties
  return (
    <Tag ref={ref} className={className} data-reveal="" data-visible={inView} style={style}>
      {children}
    </Tag>
  )
}
