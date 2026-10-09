import type { CSSProperties } from 'react'

import styles from './HeroBeams.module.css'

/** Лучи до поворота: x — сдвиг от центра поля (px), w — ширина (px), tone — оттенок палитры. */
const BEAMS = [
  { x: -560, w: 190, tone: 'deep' },
  { x: -330, w: 230, tone: 'main' },
  { x: -80, w: 200, tone: 'light' },
  { x: 150, w: 250, tone: 'main' },
  { x: 430, w: 180, tone: 'deep' },
] as const

/** Порядок появления: от центра к краям, чтобы свет «разгорался» из-под заголовка. */
const ORDER = [3, 1, 0, 2, 4] as const

function Beams({ className }: { className: string | undefined }) {
  return (
    <div className={className}>
      {BEAMS.map((beam, index) => (
        <span
          key={beam.x}
          className={styles.beam}
          data-tone={beam.tone}
          style={
            {
              '--x': `${String(beam.x)}px`,
              '--w': `${String(beam.w)}px`,
              '--i': ORDER[index],
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

/**
 * Фон Hero в духе Raycast — без картинок и без живых SVG-фильтров на весь экран:
 * лучи — CSS-градиенты, тёмно-синяя «аберрация» — такой же слой под ними, который расходится
 * при появлении, а зернистые края дают шум и `contrast()` на общем слое.
 */
export function HeroBeams() {
  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.grain}>
        <div className={styles.field}>
          <Beams className={styles.fringe} />
          <Beams className={styles.main} />
        </div>
      </div>
    </div>
  )
}
