/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['dist/**', 'node_modules/**'],
  overrides: [
    // CSS Modules (Ф-13): свои классы читаются как `styles.fileHeader`, поэтому camelCase;
    // `ant-*` — классы antd, и только внутри `:global(...)`: вне его CSS Modules хеширует
    // имя, и переопределение молча не срабатывает. `:global`/`:local` и `composes` —
    // синтаксис CSS Modules, а не опечатки.
    {
      files: ['**/*.module.css'],
      rules: {
        'selector-class-pattern': '^([a-z][a-zA-Z0-9]*|ant-[a-z0-9-]+)$',
        'selector-disallowed-list': [
          [/(?<!:global\([^)]*)\.ant-/],
          { message: (selector) => `Wrap antd classes in :global(...): "${selector}"` },
        ],
        'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
        'property-no-unknown': [true, { ignoreProperties: ['composes'] }],
        'value-keyword-case': ['lower', { ignoreProperties: ['composes'] }],
      },
    },
  ],
}
