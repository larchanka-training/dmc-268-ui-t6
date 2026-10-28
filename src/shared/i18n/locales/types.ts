/**
 * The shape of the Russian dictionary: the English one with every text widened to `string`. A
 * plural pair of the reference (`key_one`, `key_other`) also requires the forms Russian adds
 * (`key_few`, `key_many`): a missing one would make i18next fall back to the English `_other`.
 */
export type Translation<T> = {
  [K in keyof T]: T[K] extends string ? string : Translation<T[K]>
} & {
  [K in keyof T as K extends `${infer Base}_one` ? `${Base}_few` | `${Base}_many` : never]: string
}
