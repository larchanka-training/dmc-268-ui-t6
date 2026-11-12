import { useEffect, useRef } from 'react'

import { useReducedMotion } from '../lib/useReducedMotion'

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const CELL = 4
/** Длительность волны появления и затухание одного пикселя (доля прогона). */
const WAVE_MS = 1800
const FADE = 0.08

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const easeOut = (t: number) => 1 - (1 - t) ** 3

/** Центры двух угловых полей (низ слева, верх справа) и их радиусы: общие для плотности и волны. */
const corners = (W: number, H: number) => {
  const rx = Math.min(760, W * 0.55)
  const ry = H * 0.75
  return [
    [W * 0.06, H * 0.94, rx, ry],
    [W * 0.94, H * 0.06, rx, ry],
  ] as const
}

type Rgb = readonly [number, number, number]
/** Запасные значения тех же токенов: если CSS ещё не подключён (тесты), цвета не меняются. */
const GLOW_FALLBACK: Rgb = [96, 165, 250]
const BLUE_FALLBACK: Rgb = [37, 99, 235]

/** Цвет из CSS-переменной вида `#rrggbb` или `#rgb`; иначе запасной. */
const readColor = (style: CSSStyleDeclaration, name: string, fallback: Rgb): Rgb => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(style.getPropertyValue(name).trim())
  if (!match?.[1]) return fallback
  const hex = match[1]
  const full = hex.length === 3 ? hex.replace(/./g, '$&$&') : hex
  const channel = (at: number) => parseInt(full.slice(at, at + 2), 16)
  return [channel(0), channel(2), channel(4)]
}

interface Px {
  i: number
  key: number
  hot: boolean
}

/**
 * Поле упорядоченного дизеринга за финальным CTA: два мягких пиксельных поля растут из углов
 * (низ слева, верх справа). Плотность падает до нуля к каждой стороне канваса (плюс CSS-маска),
 * так что у поля нет края. При входе секции во вьюпорт пиксели один раз проявляются мягкой волной
 * из каждого угла; на фронте волны порог Байера решает, какая клетка следующая. При reduced motion
 * сразу рисуется итог.
 */
export function Dither() {
  const ref = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()
  // Волна играет один раз: повторный запуск эффекта (StrictMode, смена reduced motion) её не повторяет.
  const seen = useRef(false)

  useEffect(() => {
    const canvas = ref.current
    const host = canvas?.parentElement
    if (!canvas || !host) return
    // Без IntersectionObserver (старые браузеры, тесты) волну не ждём: сразу итог.
    const animate = !reducedMotion && typeof IntersectionObserver !== 'undefined'
    let pixels: Px[] = []
    let img: ImageData | null = null
    let ctx: CanvasRenderingContext2D | null = null
    let raf = 0
    let start = -1
    let glow: Rgb = GLOW_FALLBACK
    let blue: Rgb = BLUE_FALLBACK

    const build = () => {
      const W = host.clientWidth
      const H = host.clientHeight
      const w = Math.ceil(W / CELL)
      const h = Math.ceil(H / CELL)
      if (!w || !h) return false
      canvas.width = w
      canvas.height = h
      ctx = canvas.getContext('2d')
      if (!ctx) return false
      img = ctx.createImageData(w, h)
      // Палитра лендинга: яркие клетки --glow, остальные --blue.
      const style = getComputedStyle(host)
      glow = readColor(style, '--glow', GLOW_FALLBACK)
      blue = readColor(style, '--blue', BLUE_FALLBACK)
      pixels = []
      const fx = Math.min(220, W * 0.16)
      const fy = H * 0.16
      const [[ax, ay, arx, ary], [bx, by, brx, bry]] = corners(W, H)
      let maxKey = 0
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const px = x * CELL
          const py = y * CELL
          const edge =
            smooth(0, fx, px) * smooth(0, fx, W - px) * smooth(0, fy, py) * smooth(0, fy, H - py)
          const wave = 0.7 + 0.3 * Math.sin((px + py * 0.7) / CELL / 3.4)
          // Расстояние до ближайшего центра угла, 1 — край его пятна. Без промежуточного массива:
          // цикл идёт по каждой клетке секции.
          const d = Math.min(
            Math.hypot((px - ax) / arx, (py - ay) / ary),
            Math.hypot((px - bx) / brx, (py - by) / bry),
          )
          const f = Math.max(0, 1 - d) ** 2.1 * 1.2 * edge * wave * 0.4
          const t = ((BAYER[(y % 4) * 4 + (x % 4)] ?? 0) + 0.5) / 16
          if (f > t) {
            // Ключ волны: в основном расстояние от угла, остальное — насколько пиксель выше порога.
            const key = Math.min(1, d) * 0.72 + Math.min(1, t / f) * 0.28
            maxKey = Math.max(maxKey, key)
            pixels.push({ i: (y * w + x) * 4, key, hot: f > 0.3 })
          }
        }
      }
      // Нормировка: последний пиксель загорается ровно в конце прогона.
      if (maxKey > 0) for (const p of pixels) p.key /= maxKey
      return true
    }

    const paint = (progress: number) => {
      if (!img || !ctx) return
      const data = img.data
      data.fill(0)
      // Прогресс уходит чуть дальше 1, чтобы последние пиксели успели проявиться.
      const p = progress * (1 + FADE)
      for (const px of pixels) {
        const a = progress < 1 ? Math.min(1, Math.max(0, (p - px.key) / FADE)) : 1
        if (a <= 0) continue
        const [r, g, b] = px.hot ? glow : blue
        data[px.i] = r
        data[px.i + 1] = g
        data[px.i + 2] = b
        data[px.i + 3] = (px.hot ? 150 : 100) * a
      }
      ctx.putImageData(img, 0, 0)
    }

    const tick = (now: number) => {
      if (start < 0) start = now
      const lin = Math.min(1, (now - start) / WAVE_MS)
      paint(easeOut(lin))
      if (lin < 1) raf = requestAnimationFrame(tick)
    }

    if (build()) paint(animate && !seen.current ? 0 : 1)

    // Старт один раз, когда секция уже заметно внутри экрана.
    let io: IntersectionObserver | null = null
    if (animate && !seen.current) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            seen.current = true
            io?.disconnect()
            raf = requestAnimationFrame(tick)
          }
        },
        { rootMargin: '0px 0px -30% 0px' },
      )
      io.observe(host)
    }

    // При ресайзе поле пересобирается и показывает итог: волна не повторяется. Все отчёты
    // ResizeObserver за один кадр сводятся в одну пересборку.
    let first = true
    let resizeRaf = 0
    const rebuild = () => {
      resizeRaf = 0
      if (!build()) return
      if (!animate || seen.current) {
        cancelAnimationFrame(raf)
        paint(1)
      } else paint(0)
    }
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (first) {
              first = false
              return
            }
            if (!resizeRaf) resizeRaf = requestAnimationFrame(rebuild)
          })
    ro?.observe(host)
    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(resizeRaf)
      io?.disconnect()
      ro?.disconnect()
    }
  }, [reducedMotion])

  return <canvas ref={ref} aria-hidden="true" />
}
