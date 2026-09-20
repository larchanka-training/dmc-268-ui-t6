// Запускается на pre-commit только по staged-файлам.
// Проверка типов сюда намеренно не входит: tsc анализирует проект целиком,
// на подмножестве файлов он даёт ложный результат. Она живёт в pre-push.
export default {
  '*.{ts,tsx}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{js,jsx,mjs,cjs}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{css,scss}': ['stylelint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml,html}': 'prettier --write',
}
