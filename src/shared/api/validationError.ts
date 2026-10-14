import { z } from 'zod'

// FastAPI HTTPValidationError: the body of a 422.
const ValidationErrorItemSchema = z.object({
  loc: z.array(z.union([z.string(), z.number().int()])),
  msg: z.string(),
  type: z.string(),
  input: z.unknown().optional(),
  ctx: z.record(z.string(), z.unknown()).optional(),
})

export const HttpValidationErrorSchema = z.object({
  detail: z.array(ValidationErrorItemSchema),
})

export interface ValidationErrorLocation {
  path: (string | number)[]
}

/**
 * Where the server found the problem, from `ApiError.data` of a 422. `msg` is dropped on purpose:
 * it is English text the UI must not show. Any other shape (a string `detail`, a non-array
 * `detail`, a non-JSON body) yields no locations.
 */
export function validationErrorLocations(data: unknown): ValidationErrorLocation[] {
  const parsed = HttpValidationErrorSchema.safeParse(data)
  if (!parsed.success) {
    return []
  }
  return parsed.data.detail.map((item) => ({ path: item.loc }))
}
