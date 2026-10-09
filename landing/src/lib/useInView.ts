import { useEffect, useRef, useState } from 'react'

/** Становится `true` один раз — когда элемент впервые входит во вьюпорт. */
export function useInView<T extends Element>(rootMargin = '0px 0px -10% 0px') {
  const ref = useRef<T>(null)
  // Без IntersectionObserver (старые браузеры, тесты) блок считается видимым сразу.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const node = ref.current
    if (!node || inView) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [inView, rootMargin])

  return [ref, inView] as const
}
