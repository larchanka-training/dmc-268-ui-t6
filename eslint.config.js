import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'landing/dist',
      'storybook-static',
      'docs-site/.next',
      'docs-site/out',
      'docs-site/.source',
      'docs-site/next-env.d.ts',
    ],
  },

  // Исходники приложения: полный type-aware набор.
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      ...reactRefresh.configs.vite.rules,
    },
  },

  // FSD: pages/widgets/features/app import slices only through public index.ts.
  {
    files: [
      'src/pages/**/*.{ts,tsx}',
      'src/widgets/**/*.{ts,tsx}',
      'src/features/**/*.{ts,tsx}',
      'src/app/**/*.{ts,tsx}',
    ],
    ignores: ['**/*.test.{ts,tsx}', 'src/app/mocks/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/entities/*/lib/**',
                '**/entities/*/model/**',
                '**/entities/*/api',
                '**/entities/*/api/**',
              ],
              message: 'Import from the entity public index (FSD).',
            },
            {
              group: ['**/widgets/*/lib/**', '**/widgets/*/model/**', '**/widgets/*/ui/**'],
              message: 'Import from the widget public index (FSD).',
            },
            {
              group: ['**/features/*/lib/**', '**/features/*/model/**', '**/features/*/ui/**'],
              message: 'Import from the feature public index (FSD).',
            },
          ],
        },
      ],
    },
  },

  // FSD: entity slices import siblings only through public index.ts.
  // Exception: run/model/schemas.ts file-imports review/model/schemas.ts so the
  // api Zod snapshot generator can load it in Node ESM (no directory imports).
  {
    files: ['src/entities/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', 'src/entities/run/model/schemas.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../../*/lib/**',
                '../../*/model/**',
                '../../*/api',
                '../../*/api/**',
                '**/entities/*/lib/**',
                '**/entities/*/model/**',
                '**/entities/*/api',
                '**/entities/*/api/**',
              ],
              message: 'Import from the entity public index (FSD).',
            },
          ],
        },
      ],
    },
  },

  // A .jsx file is in no TS project but still reaches the bundle: the base rules, no type info.
  {
    files: ['src/**/*.jsx'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // i18n: user-facing text lives in the dictionaries of src/shared/i18n. A Cyrillic string in the
  // app code means a text that bypasses them; only the Russian dictionary, tests, stories, mocks
  // and fixtures may hold one.
  {
    files: ['src/**/*.{ts,tsx,mts,cts,jsx}'],
    ignores: [
      '**/*.test.{ts,tsx,mts,cts,jsx}',
      '**/*.stories.{ts,tsx}',
      '**/*.fixture.{ts,tsx}',
      '**/fixtures/**',
      // Mock mode only; the demo sign-in texts are imported statically, and
      // `pnpm verify:prod-bundle` checks that they stay out of the production bundle.
      'src/app/mocks/**',
      'src/features/auth/mocks/demoLoginTexts.ts',
      'src/test/**',
      'src/shared/i18n/locales/ru/**',
      // The self-names of the languages, «Русский» among them.
      'src/shared/i18n/languageNames.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...[
          'Literal[value=/[\\u0400-\\u04FF]/]',
          'TemplateElement[value.raw=/[\\u0400-\\u04FF]/]',
          // An escape (`\u{41F}`) in a template string: `raw` keeps it as written.
          'TemplateElement[value.cooked=/[\\u0400-\\u04FF]/]',
          'JSXText[value=/[\\u0400-\\u04FF]/]',
        ].map((selector) => ({
          selector,
          message: 'Cyrillic text in code: move it to the i18n dictionaries (src/shared/i18n).',
        })),
      ],
    },
  },

  // Stories export a meta object and story objects next to components, which is what Storybook
  // expects and what `only-export-components` forbids; they are never part of the app bundle.
  {
    files: ['**/*.stories.tsx', '.storybook/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // docs-site (Next.js): app/ files export `metadata`, `generateStaticParams` and route handlers
  // next to components, which Next.js requires and `only-export-components` forbids. Type-aware
  // rules use docs-site/tsconfig.json, found by projectService as the nearest tsconfig.
  {
    files: ['docs-site/app/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Конфиги на JS не входят ни в один TS-проект, поэтому type-aware правила
  // для них выключаются — иначе парсер падает на отсутствии типовой информации.
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  // Гасит правила, конфликтующие с Prettier. Обязан идти последним.
  prettierConfig,
)
