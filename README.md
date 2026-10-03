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

Запуск dev-сервера фронтенда:

```bash
pnpm dev
```

Dev-сервер Vite настроен с прокси `server.proxy` для `/api` на локальный API (`http://localhost:8000`).
Для совместной работы фронтенда и бэкенда:

1. В репозитории `dmc-268-api-t6` запустить бэкенд:
   ```bash
   uv run uvicorn app.main:app --reload
   ```
   (сервер слушает `http://localhost:8000`).
2. В репозитории `dmc-268-ui-t6` запустить `pnpm dev`. Запросы к `/api/*` прозрачно проксируются на бэкенд в рамках единого origin, что позволяет работать с `HttpOnly` refresh-cookie без настройки CORS.
3. Переменные окружения задаются в файле `.env.local`:
   ```bash
   # Локальная разработка с dev GitHub App:
   VITE_GITHUB_CLIENT_ID=Iv23liZHUgB8jVdKQfJQ
   VITE_GITHUB_APP_SLUG=dmc268-t6-reviewer-dev
   VITE_USE_MOCKS=false
   ```
   - `VITE_GITHUB_CLIENT_ID` — Client ID зарегистрированного GitHub App для входа (`Iv23liZHUgB8jVdKQfJQ` для dev-стенда);
   - `VITE_GITHUB_APP_SLUG` — Slug зарегистрированного GitHub App для формирования ссылки подключения репозиториев (`dmc268-t6-reviewer-dev` для dev-стенда);
   - `VITE_USE_MOCKS` — при `true` включает мок-транспорт для автономной работы фронтенда без бэкенда;
   - `VITE_API_BASE_URL` — базовый префикс API (по умолчанию `/api`). При локальной разработке с Vite **не следует** указывать полный URL вида `http://localhost:8000/api`, иначе запросы пойдут мимо `server.proxy`, перестанут передаваться `HttpOnly`/`SameSite` cookies и авторизация сломается. Оставляйте значение по умолчанию (`/api`).
4. В настройках GitHub App указать Callback URL: `http://localhost:5173/auth/callback` (или `<origin>/auth/callback` для альтернативного порта/стенда).

## Build

```bash
pnpm build
```

## Test

```bash
pnpm test          # vitest run
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
