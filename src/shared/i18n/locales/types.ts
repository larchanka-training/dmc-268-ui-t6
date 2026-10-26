/**
 * The shape of a dictionary with every text widened to `string`: another language fills it. A
 * plural pair of the reference (`key_one`, `key_other`) also admits the forms some languages add
 * (`key_few`, `key_many` for Russian).
 */
export type Translation<T> = {
  [K in keyof T]: T[K] extends string ? string : Translation<T[K]>
} & {
  [K in keyof T as K extends `${infer Base}_one` ? `${Base}_few` | `${Base}_many` : never]?: string
}
