import type { RulesStatus } from '../../entities/repository'
import { MOCK_NOW } from './app-state'

const RULES_PATH = '.review/rules.md'

// One status per mock repository (ids of `mockRepositories`): the four states the settings page
// shows. "Changed file" and load failures are the tests' business (`withMockTransportOverlay`).

const UI_RULES_TEXT = [
  '# Правила ревью: dmc-268-ui-t6',
  '',
  'Мы проверяем **доступность** и границы слоёв FSD, а не форматирование.',
  '',
  '- Базовые компоненты берутся из дизайн-системы.',
  '- Серверные данные живут в TanStack Query.',
  '',
  '```review-ignore',
  'dist/**',
  '**/*.snap',
  'pnpm-lock.yaml',
  '```',
  '',
].join('\n')

// Line 14 holds the unbalanced bracket the diagnostic points at.
const API_RULES_TEXT = [
  '# Правила ревью: dmc-268-api-t6',
  '',
  'Миграции проверяем отдельно, поэтому в этот ревью они не попадают.',
  '',
  '- Публичные ответы описаны схемами.',
  '- Секреты не попадают в логи.',
  '',
  'Исключения:',
  '',
  '```review-ignore',
  'migrations/**',
  'docs/generated/**',
  '**/*.lock',
  'src/[generated/**',
  '```',
  '',
].join('\n')

export const mockRulesStatuses: Record<string, RulesStatus> = {
  // ui-t6: the file is read from a release branch, not from the default one.
  '22222222-2222-4222-8222-000000000001': {
    status: 'present',
    branch: 'release/2.1',
    path: RULES_PATH,
    checkedAt: MOCK_NOW,
    sha: '3fa1c0de9b7e4a52d1f8c6b0a49e7d3c2b1a0f98',
    text: UI_RULES_TEXT,
    ignoreMasks: ['dist/**', '**/*.snap', 'pnpm-lock.yaml'],
    diagnostics: [],
  },
  // api-t6: the file is refused because of a mask on line 14.
  '22222222-2222-4222-8222-000000000002': {
    status: 'invalid',
    branch: 'main',
    path: RULES_PATH,
    checkedAt: MOCK_NOW,
    sha: '9b0e7d1a4c3f2e8d6a5b4c3d2e1f0a9b8c7d6e5f',
    text: API_RULES_TEXT,
    diagnostics: [
      {
        code: 'policy_ignore_pattern_invalid',
        message: 'Маска не принята: не закрыта квадратная скобка',
        line: 14,
        column: 5,
        retryable: false,
        patternIndex: 3,
      },
    ],
  },
  // infra-t6: the App has no access, so the server cannot even name the revision.
  '22222222-2222-4222-8222-000000000003': {
    status: 'unavailable',
    branch: 'master',
    path: RULES_PATH,
    checkedAt: MOCK_NOW,
    sha: null,
    diagnostics: [
      {
        code: 'policy_access_denied',
        message: 'GitHub отказал в доступе к репозиторию',
        line: null,
        column: null,
        retryable: false,
      },
    ],
  },
  // docs-t6: there is no .review/rules.md, the service defaults apply.
  '22222222-2222-4222-8222-000000000004': {
    status: 'missing',
    branch: 'main',
    path: RULES_PATH,
    checkedAt: MOCK_NOW,
    sha: '5c4b3a2918f7e6d5c4b3a2918f7e6d5c4b3a2918',
    defaultsVersion: '2026-10-01',
  },
}
