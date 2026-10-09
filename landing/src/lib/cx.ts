/** Склеивает классы, пропуская пустые: CSS Modules типизированы как `string | undefined`. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
