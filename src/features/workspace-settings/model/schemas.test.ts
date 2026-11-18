import { describe, expect, it } from 'vitest'

import {
  DeleteWorkspaceRequestSchema,
  WORKSPACE_NAME_MISMATCH_DETAIL,
  WorkspaceNameMismatchErrorSchema,
} from './schemas'

describe('workspace-settings schemas', () => {
  describe('DeleteWorkspaceRequestSchema', () => {
    it('accepts confirmation_name with length between 1 and 255 characters', () => {
      expect(() => DeleteWorkspaceRequestSchema.parse({ confirmation_name: 'a' })).not.toThrow()
      expect(() =>
        DeleteWorkspaceRequestSchema.parse({ confirmation_name: 'acme-corp' }),
      ).not.toThrow()
      expect(() =>
        DeleteWorkspaceRequestSchema.parse({ confirmation_name: 'Acme Corp' }),
      ).not.toThrow()
      expect(() =>
        DeleteWorkspaceRequestSchema.parse({ confirmation_name: 'x'.repeat(255) }),
      ).not.toThrow()
    })

    it('rejects empty, overlong or missing confirmation_name', () => {
      expect(() => DeleteWorkspaceRequestSchema.parse({ confirmation_name: '' })).toThrow()
      expect(() =>
        DeleteWorkspaceRequestSchema.parse({ confirmation_name: 'x'.repeat(256) }),
      ).toThrow()
      expect(() => DeleteWorkspaceRequestSchema.parse({})).toThrow()
      expect(() => DeleteWorkspaceRequestSchema.parse(null)).toThrow()
    })
  })

  describe('WorkspaceNameMismatchErrorSchema', () => {
    it('validates exact detail literal workspace_name_mismatch', () => {
      const parsed = WorkspaceNameMismatchErrorSchema.parse({
        detail: WORKSPACE_NAME_MISMATCH_DETAIL,
      })
      expect(parsed.detail).toBe('workspace_name_mismatch')
    })

    it('rejects incorrect detail or non-object payloads', () => {
      expect(() => WorkspaceNameMismatchErrorSchema.parse({ detail: 'wrong_detail' })).toThrow()
      expect(() => WorkspaceNameMismatchErrorSchema.parse({})).toThrow()
      expect(() => WorkspaceNameMismatchErrorSchema.parse(null)).toThrow()
      expect(() => WorkspaceNameMismatchErrorSchema.parse(undefined)).toThrow()
      expect(() => WorkspaceNameMismatchErrorSchema.parse('workspace_name_mismatch')).toThrow()
      expect(() => WorkspaceNameMismatchErrorSchema.parse(123)).toThrow()
    })
  })
})
