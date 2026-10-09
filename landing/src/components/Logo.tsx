interface LogoProps {
  size?: number
  className?: string
}

/**
 * Знак: круг, рассечённый узкой вертикальной щелью со смещением вправо — «сканер», проходящий
 * по коду. Две фигуры без масок, поэтому чисто рендерится в 16×16 и красится через currentColor.
 */
export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.5 2.318A10 10 0 1 0 14.5 21.682Z" />
      <path d="M17 3.34A10 10 0 0 1 17 20.66Z" />
    </svg>
  )
}
