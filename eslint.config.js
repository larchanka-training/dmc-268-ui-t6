import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },

  // Исходники приложения: полный type-aware набор.
  {
    files: ['**/*.{ts,tsx}'],
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
              group: ['**/entities/*/lib/**', '**/entities/*/model/**', '**/entities/*/api/**'],
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

  // Конфиги на JS не входят ни в один TS-проект, поэтому type-aware правила
  // для них выключаются — иначе парсер падает на отсутствии типовой информации.
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  // Гасит правила, конфликтующие с Prettier. Обязан идти последним.
  prettierConfig,
)
