import { useRef, useState, type KeyboardEvent } from 'react'

export interface ChartRovingFocusItemProps<T extends SVGGraphicsElement> {
  ref: (node: T | null) => void
  tabIndex: number
  onFocus: () => void
  onKeyDown: (event: KeyboardEvent<T>) => void
}

export interface ChartRovingFocus<T extends SVGGraphicsElement> {
  getItemProps: (index: number) => ChartRovingFocusItemProps<T>
}

export function useChartRovingFocus<T extends SVGGraphicsElement>(
  count: number,
): ChartRovingFocus<T> {
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<(T | null)[]>([])
  const safeIndex = count > 0 ? Math.min(activeIndex, count - 1) : 0

  function getItemProps(index: number): ChartRovingFocusItemProps<T> {
    return {
      ref: (node: T | null) => {
        itemRefs.current[index] = node
      },
      tabIndex: index === safeIndex ? 0 : -1,
      onFocus: () => {
        setActiveIndex(index)
      },
      onKeyDown: (event: KeyboardEvent<T>) => {
        if (count === 0) return
        let nextIndex: number | null = null
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          nextIndex = (index + 1) % count
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          nextIndex = (index - 1 + count) % count
        } else if (event.key === 'Home') {
          nextIndex = 0
        } else if (event.key === 'End') {
          nextIndex = count - 1
        }
        if (nextIndex === null) return
        event.preventDefault()
        setActiveIndex(nextIndex)
        itemRefs.current[nextIndex]?.focus()
      },
    }
  }

  return { getItemProps }
}
