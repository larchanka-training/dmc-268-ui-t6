import { i18n } from './i18n'

function locale(): string {
  return i18n.language
}

/** A number in the notation of the current language (digit grouping, decimal mark). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale()).format(value)
}

/** A USD amount. Exact zero is "$0"; every other value keeps two decimal places. */
export function formatUsd(value: number): string {
  if (value === 0) {
    return '$0'
  }
  return `$${value.toFixed(2)}`
}

function unit(value: number, name: 'second' | 'minute'): string {
  return new Intl.NumberFormat(locale(), {
    style: 'unit',
    unit: name,
    unitDisplay: 'short',
  }).format(value)
}

/** A duration in whole minutes and seconds, for example "2 min 5 sec" or "<1 sec". */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `<${unit(1, 'second')}`
  }
  const totalSeconds = Math.floor(ms / 1000)
  if (ms < 60000) {
    return unit(totalSeconds, 'second')
  }
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${unit(minutes, 'minute')} ${unit(seconds, 'second')}`
}
