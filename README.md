# DMC-268 UI (Team 6)

Vite + React + TypeScript frontend for DMC-268 Team 6.

## Setup

Требуется Node.js 20+ и pnpm.

Начиная с Node.js 25 в дистрибутив не входит corepack, поэтому pnpm ставится напрямую:

```bash
npm install -g pnpm
```

Установка зависимостей (заодно подтягивает git-хуки через `prepare`):

```bash
pnpm install
```

Версия pnpm зафиксирована в поле `packageManager` в `package.json`.

## Run

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Lint & format

```bash
pnpm lint          # eslint + stylelint
pnpm lint:es       # только eslint
pnpm lint:css      # только stylelint
pnpm format        # prettier --write
pnpm format:check  # prettier --check
```

## Type check

```bash
pnpm check-types
```

## Git hooks

Хуки ставит Husky при `pnpm install`.

| Хук          | Что делает                                                          |
| ------------ | ------------------------------------------------------------------- |
| `pre-commit` | `lint-staged`: eslint `--fix`, prettier, stylelint по staged-файлам |
| `pre-push`   | `pnpm check-types` и `pnpm lint` по всему проекту                   |

Проверка типов намеренно не входит в `pre-commit`: `tsc` анализирует проект
целиком и на подмножестве staged-файлов даёт недостоверный результат.

## Конфигурация

| Файл                    | Назначение                                                             |
| ----------------------- | ---------------------------------------------------------------------- |
| `tsconfig.json`         | solution-файл, ссылается на `tsconfig.app.json` и `tsconfig.node.json` |
| `tsconfig.app.json`     | исходники в `src/`, строгий режим                                      |
| `tsconfig.node.json`    | конфиги сборки (`vite.config.ts`)                                      |
| `eslint.config.js`      | flat config, type-aware правила typescript-eslint                      |
| `.prettierrc.json`      | форматирование                                                         |
| `stylelint.config.js`   | линтинг CSS                                                            |
| `lint-staged.config.js` | задачи pre-commit                                                      |
| `pnpm-workspace.yaml`   | allowlist postinstall-скриптов зависимостей                            |
