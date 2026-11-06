# CI/CD — Web UI (команда 6)

|                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Статус              | рабочий каркас пайплайна                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Владелец            | инфраструктура (роль 3)                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Связанные документы | в репозитории [dmc-268-api-t6](https://github.com/larchanka-training/dmc-268-api-t6): [SYSTEM_DESIGN.md](https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md#14-развёртывание-v1) (§14), [CICD.md](https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/CICD.md) (edge-прокси), [INFRASTRUCTURE.md](https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/INFRASTRUCTURE.md) (Terraform-стек `ui-staging`) |

Пайплайн прогоняет гейты качества, собирает статический React UI, публичный лендинг (`landing/`) и пользовательскую документацию (`docs-site/`) в три OCI-образа, сканирует их и выкатывает на staging. Реестр — **GitHub Container Registry**. Цель выката — общий курсовой VPS за edge-прокси (по умолчанию) или отдельный Terraform-хост в Hetzner Cloud (§2); лендинг и документация выкатываются только на курсовой VPS (§4.1, §4.2). Edge-прокси, Terraform-стек `terraform/ui-staging/` и DNS живут только в **API-репозитории**: этот репозиторий их не выкатывает и `terraform apply` не делает.

---

## 1. Конвейер

```mermaid
flowchart TD
  pr["PR / push"] --> quality["lint, check-types, format:check, test, build<br/>(required check)"]
  pr --> smoke["production browser smoke<br/>(required check)"]
  pr --> build["docker build UI + лендинг + docs (один раз)<br/>(required check)"]
  build --> scan["trivy: vuln / secret / misconfig"]
  quality --> gate{"main?"}
  smoke --> gate
  scan --> gate
  gate -->|нет| stop["CI зелёный, без выката"]
  gate -->|да| push["push :sha (@digest) всех образов в GHCR"]
  push --> target["Resolve staging target"]
  target --> prep["Prepare host: provision.sh"]
  prep -->|Terraform-хост| deploy["deploy.sh: compose up по digest"]
  prep -->|курсовой VPS| tls["ждать TLS edge-прокси, до 180 с"]
  tls --> deploy
  deploy --> health["GET /health снаружи"]
  health -->|ok| landing["лендинг (курсовой VPS): deploy.sh + проверка"]
  health -->|ok| promote["promote-staging: VM всё ещё на этих digest → :staging"]
  landing -->|ok| promote
  landing -->|fail| rbl["откат только лендинга; UI остаётся и продвигается"]
  rbl --> fail
  health -->|ok| docs["docs (курсовой VPS): deploy.sh + проверка /docs"]
  docs -->|ok| promote
  docs -->|fail| rbd["откат только docs; UI и лендинг остаются и продвигаются"]
  rbd --> fail
  health -->|fail| rb["авто-rollback, ROLLBACK_MODE=auto"]
  deploy -->|fail| rb
  rb --> fail["job красный; ошибка rollback видна отдельно"]
```

| Job                           | Когда                              | Permissions                                                                                            | Что делает                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `UI quality`                  | PR и `main`                        | `contents: read`                                                                                       | гейты качества: пустой в git `docs/plans`, `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm verify:prod-bundle`, затем `pnpm --dir landing` check-types / test / build и `pnpm --dir docs-site` check-types / build; required check в правилах `main` (§8)                                                             |
| `Production browser smoke`    | PR и `main`                        | `contents: read`                                                                                       | отдельная сборка UI без моков и `pnpm smoke:prod-app` в Chromium; стоит в `needs` у `Push Docker image`; required check в правилах `main` (§8)                                                                                                                                                                                                               |
| `PR size label`               | только PR                          | `contents: read`, `pull-requests: write`                                                               | добавленные плюс удалённые строки PR (merge-коммит против `HEAD^1`) без `PR_SIZE_EXCLUDE`: `pnpm-lock.yaml`, `docs/evidence/**`; одна метка `size/S` (< 300), `size/M` (< 1000), `size/L` (< 3000) или `size/XL`, пересчёт на каждый push; от 1000 строк — warning с правилом нарезки. Только информирует, не required; та же job в api (api#378)            |
| `Docker image build`          | PR и `main`                        | `contents: read`                                                                                       | по одному build UI (`Dockerfile`), лендинга (`landing/Dockerfile`) и документации (`docs-site/Dockerfile`), смоук образа UI (`scripts/smoke-image.mjs`, §3), artifacts для scan/push                                                                                                                                                                         |
| `Docker image security scan`  | после сборки                       | `contents: read`                                                                                       | Trivy тех же artifacts, всех трёх образов                                                                                                                                                                                                                                                                                                                    |
| `Push Docker image`           | только `main`                      | `contents: read`, `packages: write`, `actions: read`                                                   | push `:sha` всех трёх образов, resolve digest (те же artifacts, что прошли Trivy)                                                                                                                                                                                                                                                                            |
| `Deploy staging`              | только `main`                      | `contents: read`, `packages: read`                                                                     | выбор цели (§2), подготовка хоста, Compose по digest, внешний health check; на курсовом VPS следом лендинг (§4.1) и документация (§4.2); авто-rollback при ошибке deploy или health, сбой лендинга или документации откатывает только свою часть; связи шагов — §2.1                                                                                         |
| `Promote staging tag`         | после успешного health check UI    | `contents: read`, `packages: write`                                                                    | под lock `staging-deploy` читает `.deploy-state` UI, лендинга и документации на VM (без токена); если там всё ещё эти digest — `:staging-previous` ← `:staging`, `:staging` ← проверенный digest для каждого образа (лендинг и документация — только если прошла своя часть), иначе warning и пропуск; если `:staging` уже на этом digest, теги не трогаются |
| `Rollback staging` (workflow) | `workflow_dispatch`, только `main` | `rollback`: `contents: read`, `packages: read`; `promote-staging`: `contents: read`, `packages: write` | откат UI и/или лендинга либо документации на VM, проверка снаружи, синхронизация `:staging` (§6)                                                                                                                                                                                                                                                             |

Корневые permissions: `contents: read`, остальное — только у job, которому нужно. Все jobs работают на `ubuntu-latest`.

### Обновление пакетов в runtime и диагностика CVE

Все три образа используют GitHub Actions cache для стадии `build`; `no-cache-filters: runtime` заставляет Buildx каждый раз выполнять стадию `runtime`, включая неизменённую команду `RUN apk update && apk upgrade --no-cache …`. Поэтому все три Dockerfile должны сохранять имя `AS runtime`: при переименовании стадии нужно изменить и фильтр в workflow. Стадия `build` остаётся доступной для кэша, если её входные данные не изменились. Цена этого выбора, включая новый digest как обычный исход сборки, описана в §5. `apk upgrade` обновляет пакеты из настроенного Alpine-репозитория в целом. Образ UI собран на `1.30-alpine-slim` и списка пакетов не имеет: в этой базе нет `curl`, `tiff`, `libexpat` и `brotli-libs`, а `apk add` доустановил бы их. У лендинга и документации явный список `apk add --upgrade` сейчас содержит `pcre2`, `tiff`, `libexpat>=2.10.0-r0`, `brotli-libs` и `curl`. Нижняя граница версии `libexpat` прерывает сборку, если исправленная версия недоступна; остальные имена без ограничения версии сами по себе не доказывают наличие исправления. Новый пакет добавляйте в список только при подтверждённой необходимости, которую не покрывает `apk upgrade`; задавайте минимальную исправленную версию, если сборка должна падать при её отсутствии.

Если Trivy всё ещё находит исправленную CVE в пакете базового образа, проверьте в логе **Docker image build**, что под шагом `RUN apk update …` стадии `runtime` есть вывод самого `apk`, например `OK: … distinct packages available` и, когда пакеты обновились, строки обновления. Отсутствия `CACHED` недостаточно: слой из кэша может показывать только `extracting sha256:…` без вывода команды. После загрузки artifact-образа, как в job сканирования (`gunzip -c docker-image.tar.gz | docker load`), проверьте установленную версию, например:

```sh
docker run --rm --entrypoint apk dmc-268-ui:ci info -v | grep '^pcre2-'
```

Для лендинга и документации используйте их загруженные artifact-образы `dmc-268-landing:ci` и `dmc-268-docs:ci`. Если исправления в настроенном Alpine-репозитории нет, нужен доступный источник исправленного пакета или обновление базового образа. Если `apk` завершился ошибкой из-за временного сбоя зеркала, проверьте лог и повторно запустите упавшую job.

`UI quality` сразу после checkout падает, если в git есть файлы каталога `docs/plans` (`git ls-files docs/plans` не пуст: планы — локальные рабочие файлы и не коммитятся, api#265), затем ставит Node.js 24 (как build-стадия `Dockerfile`) и pnpm версии из `packageManager`, затем выполняет `pnpm install --frozen-lockfile` и шесть гейтов по порядку (последний, `pnpm verify:prod-bundle`, идёт после `pnpm build` и проверяет `dist/assets`: нет mock/demo-кода, а вызов zod `jitless` исполняется раньше первой схемы); первый упавший шаг делает job красным. Job стоит в `needs` у `Push Docker image`: с красными гейтами образ не пушится и staging не выкатывается. На PR job отменяется вместе со всем run при новом push в ветку (`cancel-in-progress` в `concurrency` workflow). Лимит job — 15 минут (`timeout-minutes`): зависший прогон не держит обязательную проверку и `Push Docker image` до стандартных шести часов.

Шаги `Deploy staging`: **Resolve staging target** → копирование `deploy/` в `APP_DIR` (`appleboy/scp-action`; на курсовом VPS ещё файлы лендинга и документации, каждые в свой `APP_DIR`) → **Prepare host** → (курсовой VPS) ожидание TLS → **Deploy image** (`deploy.sh`) → **Health check** → (курсовой VPS) **Deploy landing image** → **Landing health check** → (курсовой VPS, независимо от лендинга) **Deploy docs image** → **Docs health check** → при ошибке лендинга **Rollback landing on failed deploy or health check**, при ошибке документации **Rollback docs on failed deploy or health check**, при ошибке UI **Rollback on failed deploy or health check** (все `ROLLBACK_MODE=auto`, каждый откатывает только свою часть) → job красный, в логе сообщение о том, что упало (у сбоя лендинга и документации это `::error::`). После сбоя лендинга `Promote staging tag` всё равно продвигает проверенный UI (`!cancelled()` и флаг `promote`), тег лендинга не двигается (`promote_landing=false`); так же с документацией (`promote_docs`). UI тогда уже выкачен; повторный выкат того же коммита (**Re-run failed jobs**) не трогает точку отката UI на VM: `deploy.sh` переносит `.deploy-state` в `.deploy-state.previous`, только если выкатывается другой образ. Что допустимо при повторе и что будет, если на нём упадёт проверка UI, — §2.1.

**Prepare host** переименовывает `staging*.yml` в `compose.yml`, `compose.ports.yml`, `compose.edge.yml` и запускает `provision.sh` (копия из API-репозитория) с `APP_DIR` и `EDGE_NETWORK` (`dmc268-edge` только на курсовом VPS): при необходимости ставит Docker и Compose из пакетов Debian (под `flock` вместе с прогонами API), создаёт `APP_DIR` и сеть `dmc268-edge`. Workflow Rollback делает то же перед откатом.

---

## 2. Две цели выката

Шаг **Resolve staging target** в `deploy-staging`, `promote-staging` и Rollback выбирает цель. Хост, порт, способ входа, `APP_DIR`, режим публикации и URL во всех шагах берутся только из него.

|                             | Курсовой VPS                                                                                                                                                                | Terraform / Hetzner                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Когда                       | `STAGING_HOST` пуст                                                                                                                                                         | задан `STAGING_HOST`                                                                                                               |
| SSH                         | `VPS_DMC268_IP_T6`:22, `VPS_DMC268_U` + пароль `VPS_DMC268_P`                                                                                                               | `STAGING_HOST`:`STAGING_SSH_PORT` (Terraform output `ssh_port`, по умолчанию `22022`), `STAGING_SSH_USER` + ключ `STAGING_SSH_KEY` |
| Host key                    | repository variable `STAGING_SSH_FINGERPRINT`                                                                                                                               | тот же variable (значение Environment `staging` перекрывает repository)                                                            |
| `APP_DIR` / compose project | `/opt/dmc-268-ui-staging` / `dmc-268-ui-staging`                                                                                                                            | `/opt/dmc-268-ui` / `dmc-268-ui`                                                                                                   |
| Публикация UI               | без host-порта: сеть `dmc268-edge`, alias `ui-staging`, порт 8080 (`compose.edge.yml`)                                                                                      | host-порт `80:8080` (`compose.ports.yml`), без edge                                                                                |
| URL / health                | `https://staging-ui.<APP_DOMAIN>`, `/health`                                                                                                                                | `http://<STAGING_HOST>`, `/health` (или `STAGING_HEALTH_URL`)                                                                      |
| Docker                      | ставит `provision.sh` при первом прогоне                                                                                                                                    | из cloud-init; `provision.sh` ничего не ставит                                                                                     |
| Bootstrap до первого выката | нет; после отката UI без previous — nginx в `dmc268-edge` с alias `ui-staging`, слушает 8080. У лендинга bootstrap нет: без previous его стек только останавливается (§4.1) | `dmc-268-ui-bootstrap` из cloud-init на `:80`                                                                                      |
| Лендинг                     | `APP_DIR` `/opt/dmc-268-landing-staging` (compose project `dmc-268-landing-staging`), сеть `dmc268-edge`, alias `landing-staging`, `https://staging.<APP_DOMAIN>` (§4.1)    | не выкатывается: хост отдаёт только UI на `:80`                                                                                    |
| Документация                | `APP_DIR` `/opt/dmc-268-docs-staging` (compose project `dmc-268-docs-staging`), сеть `dmc268-edge`, alias `docs-staging`, `https://staging.<APP_DOMAIN>/docs` (§4.2)        | не выкатывается                                                                                                                    |

- `key` уходит только на Terraform-хост, пароль — только на VPS, и только как input `appleboy/*` (в скрипты на хосте он не передаётся).
- `STAGING_SSH_FINGERPRINT` обязателен для обеих целей, формат `SHA256:<43 символа base64>`. С пустым fingerprint appleboy принимает любой host key, поэтому job с SSH падает первым шагом. Значения цели проверяются на одну строку, URL — на `http(s)://` без пробелов.
- При переключении цели (задать или очистить `STAGING_HOST`) обновите `STAGING_SSH_FINGERPRINT`: при несовпадении host key все SSH-шаги падают, выката на чужой хост не будет.
- `APP_DIR` Terraform-хоста менять нельзя: cloud-init держит `dmc-268-ui-bootstrap` на `:80`, а `deploy.sh` снимает контейнер `<compose project>-bootstrap`. С другим именем проекта bootstrap останется на порту 80, и `compose up` упадёт.
- SSH Terraform-хоста открыт миру намеренно: у GitHub-hosted runners нет стабильных egress IP. Защита — нестандартный порт, вход только по ключу и fail2ban ([INFRASTRUCTURE.md, §4.1](https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/INFRASTRUCTURE.md#41-ssh-доступ)). Курсовой VPS общий: там порт 22 и пароль, sshd и firewall не меняем.

### 2.1 Курсовой VPS: связи шагов UI, лендинга и документации

Лендинг и документация есть только на курсовом VPS. При выкате части связаны так (при откате — §6):

- **Лендинг и документация зависят от UI.** Упал **Deploy image** или **Health check** UI — их выкат пропускается.
- **UI зависит от них только до Deploy image.** **Upload landing deploy files**, **Upload docs deploy files** и их блоки в **Prepare host** идут раньше и без `always()`. Упал один из этих шагов — выкат не начинается: образы на хосте не меняются, откатывать нечего, job красный.
- **После успешного Health check UI части независимы.** Сбой лендинга или документации откатывает только свою часть (§4.1, §4.2), UI остаётся и продвигается, документация не зависит от результата лендинга.

Повторный запуск после сбоя только лендинга или документации:

- **Только Re-run failed jobs** (`gh run rerun <run-id> --failed`). Он берёт digest из выходов уже прошедшего `Push Docker image`: образ UI тот же, и `deploy.sh` не двигает точку отката.
- **Re-run all jobs здесь нельзя.** Он собирает и пушит образы заново, а новый digest, как правило, получается даже при том же исходном коде: это обычный исход сборки, а не исключение (§5). Если digest другой, `deploy.sh` считает образ новым: проверенный N уходит в `.deploy-state.previous`, точка отката N-1 теряется.
- **Если на повторе упала внешняя проверка UI, UI откатывается на N-1:** в `.deploy-state.previous` всё ещё N-1. Проверку может уронить, например, `caddy reload` API-репозитория, он идёт вне блокировки `staging-deploy`. `:staging` остаётся на N, job красный. Вернуть N можно новым выкатом (в том числе ещё одним **Re-run failed jobs** этого run) или ручным откатом с `image` = N (§6). Ручной откат с пустым `image` не поможет: после авто-отката и `.deploy-state`, и `.deploy-state.previous` указывают на N-1.

---

## 3. Edge-прокси (курсовой VPS)

Caddy (compose project `dmc-268-edge`) принимает 80/443 на VPS, выпускает сертификаты Let's Encrypt и маршрутизирует по имени хоста.

- **Владелец — API-репозиторий.** Этот репозиторий прокси не выкатывает и `deploy/edge/` не копирует. Маршруты меняются PR в `deploy/edge/Caddyfile` API-репозитория.
- **Контракт UI:** контейнер подключён к внешней docker-сети `dmc268-edge` с alias `ui-staging` и слушает `8080`; host-порты на VPS не публикуются (80/443 заняты прокси). Лендинг — так же, alias `landing-staging`; документация — alias `docs-staging`.
- **`/api/*` за edge-прокси и без него.** На staging и prod переменная `API_UPSTREAM` не задана: `location /api/` в nginx образа нет, а запросы `/api/*` по маршруту из таблицы ниже идут мимо UI, поэтому конфликта с Caddy нет. В compose стека из API-репозитория прокси нет, там `API_UPSTREAM=http://backend:8000` при старте контейнера добавляет этот `location` (`docker/16-api-proxy.sh`): путь и `Host` не меняются, SSE идёт без буферизации, имя резолвится на запрос, поэтому UI может стартовать раньше backend. Адрес не запекается: один и тот же образ работает в обоих режимах. Значение — только `http://<host>[:port]`, иное останавливает контейнер. Оба режима проверяет `scripts/smoke-image.mjs` в job `Docker image build`.
- Все вызовы Compose идут с `-p <basename APP_DIR>`: имя проекта не берётся из compose-файла, и UI не пересекается с API на общем VPS.
- `DEPLOY_MODE` (`edge|ports`) и `EDGE_ALIAS` сохраняются в `<APP_DIR>/.env`; `rollback.sh` читает их оттуда.
- Перед выкатом (и перед Rollback) job до 180 с ждёт успешного TLS-рукопожатия с `https://staging-ui.<APP_DOMAIN>/` (любой HTTP-статус, 502 тоже). Без сертификата job падает до изменения запущенного релиза (файлы деплоя уже загружены, **Prepare host** уже выполнен), поэтому медленный первый выпуск в Let's Encrypt не запускает авто-rollback.

| Hostname (`APP_DOMAIN` = `dmc268-t6.axyi.ru`)      | Upstream в `dmc268-edge`                                                     | Статус                                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `staging-ui.<APP_DOMAIN>`                          | `/api/*` → `api-staging:8000`, остальное → `ui-staging:8080`                 | UI выкатывает этот репозиторий, `/api/*` — репозиторий API                                                     |
| `ui.<APP_DOMAIN>`                                  | `/api/*` → `api-prod:8000`, остальное → `ui-prod:8080`                       | prod-выката пока нет → заглушка 503                                                                            |
| `staging.<APP_DOMAIN>`, `staging-www.<APP_DOMAIN>` | `/docs`, `/docs/*` → `docs-staging:8080`, остальное → `landing-staging:8080` | лендинг и документацию выкатывает этот репозиторий (§4.1, §4.2)                                                |
| `<APP_DOMAIN>`, `www.<APP_DOMAIN>`                 | `/docs`, `/docs/*` → `docs-staging:8080`, остальное → `landing-staging:8080` | пока prod-выката нет — staging-лендинг и staging-docs; с prod-выкатом переедут на `landing-prod` и `docs-prod` |

Пока upstream не запущен, `staging-ui` отвечает 502, а `ui` и хосты лендинга — заглушкой 503 edge-прокси ([CICD.md API, §8.2](https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/CICD.md#82-edge-прокси)); остальные маршруты прокси работают. Таблица выше — маршруты **после** выката PR в API-репозитории (api#240), который добавляет хосты лендинга. api#240 выкатывается раньше, чем лендинг из этого репозитория (§4.1): к первому выкату лендинга у Caddy уже есть сайты и сертификаты его хостов. Маршрут `/docs` на хостах лендинга добавляет отдельный PR в API-репозитории (§4.2); он выкатывается до первого выката документации.

---

## 4. Образ и health check

Образ собирается через **pnpm** с frozen lockfile и слушает `:8080`. Контракт живости:

```http
GET /health
200 {"status":"ok","service":"dmc-268-ui"}
```

После `compose up --wait` runner проверяет URL из резолвера снаружи, 12 попыток × 5 с: курсовой VPS — `https://staging-ui.<APP_DOMAIN>/health` через edge-прокси; Terraform-хост — `STAGING_HEALTH_URL` или `http://<STAGING_HOST>/health`. Не `ok` → авто-rollback, job красный. Bootstrap nginx `/health` не отдаёт: после отката на bootstrap проверяется `GET <base_url>/` с HTTP 200.

### 4.1 Лендинг

Образ — `landing/Dockerfile` (контекст сборки — корень репозитория, там lockfile workspace): `pnpm --dir landing build`, затем `nginxinc/nginx-unprivileged:1.30-alpine` (у UI — вариант `-slim`) с обновлением пакетов из §1, пользователем `nginx` и портом `8080`. Пакет в GHCR — `ghcr.io/<owner>/dmc-268-ui-t6-landing`, теги как у UI (§5).

```http
GET /health
200 {"status":"ok","service":"dmc-268-landing"}

GET /config.json
200 {"appUrl":"<APP_URL>"}   Cache-Control: no-cache
```

- **Адрес приложения задаётся при старте, не при сборке.** Переменная окружения `APP_URL` обязательна: `docker/landing/15-check-app-url.sh` пропускает только `http(s)://<host>[:port][/path]` (хост с числовой последней меткой только как IPv4 `a.b.c.d`, иначе его отверг бы `new URL()`), иначе контейнер не стартует (`compose up --wait` падает → авто-rollback). Затем шаг envsubst образа nginx пишет `/etc/nginx/runtime/config.json` из `docker/landing/config.json.template`; nginx отдаёт его как `/config.json` с `Cache-Control: no-cache`, так что новый `APP_URL` виден браузеру без ожидания кэша. Лендинг читает файл при загрузке; без файла берёт адрес по умолчанию из кода (контракт — `landing/src/lib/appUrl.ts` из PR #164 по #162, уже в `main`). Один образ годится для staging и prod.
- **Только курсовой VPS (режим `edge`).** На Terraform-хосте лендинга нет: хост выделен под UI на `:80`, своего маршрута для лендинга там нет. Образ всё равно собирается, сканируется и пушится на каждый `main`.
- **Выкат.** Те же `deploy.sh` / `rollback.sh`, свой `APP_DIR` `/opt/dmc-268-landing-staging`, compose project `dmc-268-landing-staging`, файлы `deploy/compose/landing.yml` и `landing.edge.yml`, alias `landing-staging`. `APP_URL` = `https://staging-ui.<APP_DOMAIN>` (URL UI из резолвера), сохраняется в `<APP_DIR>/.env` вместе с `IMAGE`, `DEPLOY_MODE`, `EDGE_ALIAS`.
- **Откат отдельно от UI.** Лендинг выкатывается после успешного health check UI того же коммита. Упал выкат или проверка лендинга — откатывается только лендинг (`ROLLBACK_MODE=auto`): исправный UI не пересоздаётся, его `:staging` продвигается, тег лендинга остаётся на прежнем релизе, job красный с `::error::` о лендинге. Так результат выката лендинга и маршруты edge-прокси в API-репозитории не влияют на приложение; сбой шагов лендинга до **Deploy image** его выкат останавливает (§2.1).
- **Без previous — остановка, не bootstrap.** Шаги лендинга передают `NO_PREVIOUS_RELEASE=stop` (сохраняется в `<APP_DIR>/.env`, его читает и break-glass `rollback.sh`). Если упал первый релиз лендинга, его стек только останавливается: на хостах лендинга отвечает заглушка 503 edge-прокси, а не стоковая страница nginx. У UI по умолчанию `bootstrap`, как раньше.
- **Проверка снаружи** (`deploy/scripts/landing-healthcheck.sh`), всегда строгая: `https://staging.<APP_DOMAIN>/health` (12 × 5 с, как у UI) и `/config.json` с ожидаемым `appUrl` (до 6 попыток с паузой 3 с). Любая ошибка, в том числе TLS-рукопожатие (curl exit 35), идёт через эти повторы: сертификат, который ещё выпускается, успевает появиться, а нет маршрута или сертификата и дальше, job красный. Проверяется только `staging.` — собственный хост staging-лендинга; основной домен и `www.` переедут на `landing-prod` вместе с prod-выкатом, поэтому staging-проверку к ним не привязываем.

  Порядок выката: PR #164 (лендинг читает `/config.json`, уже в `main`) → PR api#240 (маршруты лендинга в Caddy, его выкат делает `caddy reload`) → этот PR (первый выкат `landing-staging` сразу проходит строгую проверку) → проверить вручную основной домен и `www.`: `curl -sS https://<APP_DOMAIN>/config.json`.

### 4.2 Документация

Пользовательская документация (`docs-site/`, Fumadocs на Next.js, #173) живёт на хосте лендинга под `/docs`, своего домена у неё нет. Образ — `docs-site/Dockerfile` (контекст сборки — корень репозитория: lockfile workspace и `src/`, из которого макеты дашборда берут стили и компоненты): `pnpm --dir docs-site build` со статическим экспортом (`output: 'export'`, `basePath: '/docs'`), затем тот же `nginxinc/nginx-unprivileged:1.30-alpine`, что у лендинга. Файлы лежат в `/usr/share/nginx/html/docs`, конфиг — `docker/docs/nginx.conf`. Пакет в GHCR — `ghcr.io/<owner>/dmc-268-ui-t6-docs`, теги как у UI (§5).

```http
GET /health          (внутри контейнера, для compose healthcheck)
GET /docs/health     (то же через edge-прокси)
200 {"status":"ok","service":"dmc-268-docs"}

GET /docs            Introduction
GET /docs/<page>     страницы, /docs/mockups/<screen> (страницы макетов, источник картинок для `pnpm --dir docs-site shots`), /docs/api/search (индекс поиска)
```

- **Маршрут на edge-прокси.** Caddy на хостах лендинга отправляет `/docs` и `/docs/*` в `docs-staging:8080` без изменения пути, остальное — в `landing-staging:8080`. Маршрут живёт в `deploy/edge/Caddyfile` API-репозитория и выкатывается там до первого выката документации, иначе проверка снаружи не проходит и документация откатывается.
- **Статический сайт.** Страницы, макеты и индекс поиска собираются при `next build`; поиск идёт в браузере по `/docs/api/search`. Настроек при старте нет, `APP_URL` не нужен. Ссылка на дашборд (`NEXT_PUBLIC_APP_URL`) зашивается при сборке образа: build-arg `NEXT_PUBLIC_APP_URL` в `docs-site/Dockerfile`; CI его пока не передаёт, поэтому образ ведёт на `staging-ui`. Для prod нужен build-arg в сборке docs-образа. Ответы nginx: страницы и `*.txt` с `Cache-Control: no-cache`, текстовые ресурсы сжимаются gzip, адрес со слешем на конце получает `308` на адрес без слеша, фреймы запрещены (`X-Frame-Options: DENY`, `frame-ancestors 'none'`).
- **Выкат и откат** — как у лендинга: те же `deploy.sh` / `rollback.sh`, свой `APP_DIR` `/opt/dmc-268-docs-staging`, compose project `dmc-268-docs-staging`, файлы `deploy/compose/docs.yml` и `docs.edge.yml`, alias `docs-staging`, `NO_PREVIOUS_RELEASE=stop`. Документация выкатывается после успешного health check UI того же коммита и не зависит от результата лендинга; её сбой откатывает только её, теги UI и лендинга продвигаются, job красный с `::error::` о документации. Сбой её шагов до **Deploy image** останавливает и выкат UI (§2.1).
- **Проверка снаружи** (`deploy/scripts/docs-healthcheck.sh`): `https://staging.<APP_DOMAIN>/docs/health` (12 × 5 с) должен вернуть именно `"service":"dmc-268-docs"` (без маршрута `/docs` запрос уходит в лендинг), затем `/docs` и `/docs/quickstart` — HTTP 200.
- **Ссылки.** Лендинг ведёт на документацию относительным `/docs` (пункт **Docs** в шапке). Приложение берёт адрес из `VITE_DOCS_URL` при сборке (§8), по умолчанию `https://staging.dmc268-t6.axyi.ru/docs` (`src/shared/config/env.ts`).

---

## 5. Container Registry и доступ с VM

| Параметр               | Значение                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Host                   | `ghcr.io`                                                                                                                                    |
| Repository             | `ghcr.io/<owner>/dmc-268-ui-t6` (UI), `ghcr.io/<owner>/dmc-268-ui-t6-landing` (лендинг), `ghcr.io/<owner>/dmc-268-ui-t6-docs` (документация) |
| Auth CI (push/promote) | `GITHUB_TOKEN`; `packages: write` только у `push-image` и двух `promote-staging`, на runner. На VM этот токен не уходит                      |
| Auth staging pull      | `GITHUB_TOKEN` с `packages: read`, только на время выката или отката                                                                         |
| Теги                   | у каждого образа: `:<git-sha>` + `@sha256:…` (deploy), `:staging` (текущий), `:staging-previous` (точка отката)                              |

Фильтр `no-cache-filters: runtime` выбран, чтобы обновлять Alpine-пакеты при каждой сборке и сохранять кэш стадии `build`. Полный `no-cache` заново собрал бы и зависимости приложения; сброс кэша по расписанию задержал бы доступное исправление до следующего сброса. Цена выбора: каждая сборка зависит от доступности Alpine-репозитория, а новый digest, как правило, получается даже при том же исходном коде и тех же версиях пакетов: это обычный исход сборки, а не исключение. Если digest меняется, `deploy.sh` считает образ новым, пересоздаёт контейнер соответствующей части (UI, лендинг или документация) и сдвигает `.deploy-state.previous`; promotion сдвигает её `:staging-previous`. Поэтому точка отката может указывать на предыдущую сборку того же кода.

На VM `deploy.sh` логинится в GHCR во временный `DOCKER_CONFIG` (`mktemp -d`), а не в `/root/.docker/config.json`: выкаты API и UI под общим root на курсовом VPS не мешают друг другу. Сразу после `compose up` — `docker logout`, при выходе каталог удаляется (trap). `rollback.sh`, запущенный из `deploy.sh`, использует тот же каталог и его логин; запущенный отдельно — создаёт и удаляет свой.

---

## 6. Rollback

`rollback.sh` работает в одном из режимов `ROLLBACK_MODE`; другое значение — отказ до любых изменений.

1. **Автоматический (`ROLLBACK_MODE=auto`).** Запускается из `deploy.sh`, если упал `compose up`, и шагом **Rollback on failed deploy or health check**, если не прошёл health check. Поднимает образ из `.deploy-state.previous` и **не** записывает упавший образ в previous: повторный откат не вернёт сломанный релиз. Без previous восстанавливается bootstrap, `.deploy-state` и `.deploy-state.previous` удаляются — и когда выкатов ещё не было, и когда упал первый релиз (в том числе только на внешнем health check): упавший релиз не остаётся в `.deploy-state`, и следующий выкат не скопирует его в previous. Job красный, тег `:staging` не меняется. Лендинг и документация откатываются так же, каждый из своего `APP_DIR`, но без previous их стек только останавливается (`NO_PREVIOUS_RELEASE=stop`, §4.1, §4.2); их ошибка UI не трогает, а сбой документации не трогает лендинг. Не удалось остановить стек или проверить это (упал `compose ps`) — `rollback.sh` выходит с ошибкой, `.deploy-state` остаётся, но с меткой `stop_failed=true`: релиз ещё может работать, однако следующий выкат и ручной откат не перенесут его в previous.
2. **Ручной (`ROLLBACK_MODE=manual`, по умолчанию).** Actions → **Rollback staging** → Run workflow, ветка `main`. С другой ветки jobs пропускаются до входа в Environment `staging`, а run не встаёт в группу `staging-deploy` (своя группа `rollback-ignored-<run_id>`).
   - `reason` — обязателен.
   - Пустой `image` — предыдущий релиз: `.deploy-state.previous` на VM, иначе `:staging-previous` из GHCR, иначе bootstrap. Релиз, с которого откатились, становится новым previous (как `:staging` → `:staging-previous`), если на нём нет метки `stop_failed=true` (п. 1).
   - Конкретная версия — полный 40-символьный git SHA (→ `ghcr.io/<owner>/dmc-268-ui-t6:<sha>`), `sha256:<64 hex>` или полный `ghcr.io/<owner>/dmc-268-ui-t6:<полный sha>` / `…@sha256:<digest>`. Короткий SHA, `staging-previous`, `latest`, другой реестр или репозиторий, значение с переводом строки job отклоняет до SSH.
   - Цель разрешается в immutable digest, выкатывается на VM и проверяется снаружи (§4).
   - Затем job читает с VM `.deploy-state` (строка `current_image=…` или маркер `bootstrap=true`) и продвигает в `:staging` только образ, который реально запущен и совпадает с целью; прежний `:staging` → `:staging-previous`. Promotion принимает только `ghcr.io/<owner>/dmc-268-ui-t6` с `:<полный sha>` или `@sha256:<digest>`. Bootstrap — без promotion, job зелёный. Расхождение — job красный, `:staging` не меняется.
   - `component` — `ui-and-landing` (по умолчанию, обе части), `ui`, `landing` или `docs`. Цель каждой части разрешается отдельно: `image` не задаёт версию лендинга, для пары из одного коммита укажите оба поля. На Terraform-хосте лендинга нет: `ui-and-landing` откатывает только UI, `landing` — отказ до SSH. `image` при `component=landing` и `landing_image` без отката лендинга тоже отклоняются.
   - `landing_image` — версия лендинга в тех же форматах, но для `ghcr.io/<owner>/dmc-268-ui-t6-landing`; пустой — предыдущий релиз лендинга (`.deploy-state.previous` в его `APP_DIR`, иначе его `:staging-previous`). Bootstrap у лендинга нет: если previous нет нигде, при `ui-and-landing` лендинг не трогается (warning, откатывается только UI), при `component=landing` job падает до изменений на хосте (после чтения состояния с VM) с подсказкой задать `landing_image`. Проверка снаружи — как при выкате (§4.1).
   - `component=docs` откатывает только документацию; `docs_image` — её версия в тех же форматах для `ghcr.io/<owner>/dmc-268-ui-t6-docs`, пустой — предыдущий релиз (`.deploy-state.previous` в её `APP_DIR`, иначе её `:staging-previous`). Bootstrap нет: без previous job падает до изменений на хосте с подсказкой задать `docs_image`. `docs_image` при другом `component` отклоняется. Проверка снаружи — как при выкате (§4.2).
   - Шаги лендинга идут с `!cancelled()`: упавший откат или health check UI не мешает откату лендинга, и наоборот. Шаги подготовки, до **Prepare host** включительно, идут без `always()`: при `ui-and-landing` любой упавший шаг останавливает обе части до изменений образов на хосте. Дальше всё зависит от шага:
     - Сбой только UI (**Resolve requested ref**, `digest`): откатите лендинг отдельно, `component=landing`, без `image`.
     - Сбой только лендинга (**Resolve requested landing ref**, `landing_digest`, **Upload landing deploy files**, его блок в **Prepare host**): откатите UI отдельно, `component=ui`, без `landing_image`.
     - Сбой общего шага (**Read previous deploy from VM**, **Upload deploy files**, общий блок **Prepare host** и остальные шаги подготовки): отдельный запуск упадёт там же, устраните причину и запустите откат снова.
   - Promotion `:staging` идёт по каждому образу отдельно: часть, которая откатилась и прошла проверку, синхронизирует свой тег, даже если другая часть упала.

Пустые `image`, `landing_image` и `docs_image` выбирают предыдущую **сборку образа** соответствующей части, не обязательно предыдущий коммит с исправным содержимым (§5). Если предыдущая сборка содержит ту же ошибку, в **Rollback staging** выберите нужный `component` и укажите в его поле последний исправный immutable digest: `image=sha256:<digest>` для UI, `landing_image=sha256:<digest>` для лендинга или `docs_image=sha256:<digest>` для документации. Digest возьмите из лога job `Push Docker image` той попытки run, которая выкатила исправный образ: у каждого из трёх образов там своя строка `pushed ghcr.io/…@sha256:…`, имя образа показывает часть (`…-t6`, `…-t6-landing`, `…-t6-docs`). Для `ui-and-landing` задайте оба поля с digest соответствующих образов. Полный 40-символьный SHA допустим после проверки, что его тег всё ещё указывает на нужный образ; **Re-run all jobs** может перезаписать `:<sha>` новой сборкой того же коммита (§7).

На VM вручную (break-glass):

```bash
read -rs GHCR_TOKEN && export GHCR_TOKEN GHCR_USER=<github-user>   # PAT с read:packages, не попадает в history
APP_DIR=/opt/dmc-268-ui-staging /opt/dmc-268-ui-staging/rollback.sh          # курсовой VPS, previous release
/opt/dmc-268-ui/rollback.sh ghcr.io/<owner>/dmc-268-ui-t6@sha256:<digest>    # Terraform-хост, конкретный образ
APP_DIR=/opt/dmc-268-landing-staging NO_PREVIOUS_RELEASE=stop DEPLOY_MODE=edge EDGE_ALIAS=landing-staging \
  /opt/dmc-268-landing-staging/rollback.sh                                   # лендинг, previous release
APP_DIR=/opt/dmc-268-docs-staging NO_PREVIOUS_RELEASE=stop DEPLOY_MODE=edge EDGE_ALIAS=docs-staging \
  /opt/dmc-268-docs-staging/rollback.sh                                      # документация, previous release
```

Без `APP_DIR` скрипт берёт `/opt/dmc-268-ui`. У лендинга и документации без previous скрипт только останавливает стек (`NO_PREVIOUS_RELEASE=stop`); не остановился стек или упал `compose ps`, `rollback.sh` выходит с ошибкой и помечает `.deploy-state` (п. 1). Их переменные заданы в команде явно: если первый выкат упал на `docker pull`, `<APP_DIR>/.env` ещё нет, и без них скрипт поднял бы bootstrap nginx на порту 80. Пакет в GHCR приватный: без `GHCR_TOKEN` `docker pull` упадёт.

---

## 7. Конкурентность: группа `staging-deploy`

В группе `staging-deploy` (`cancel-in-progress: false`) стоят job `deploy-staging`, job `promote-staging` (CI/CD) и весь run **Rollback staging** с `main`. Выполняющийся job не отменяется. Lock снимается между deploy и promotion, поэтому ручной rollback может пройти между ними: promotion под lock читает образ на VM, видит другой digest и не перезаписывает `:staging` (warning в job).

GitHub держит в группе concurrency один выполняющийся и **только один ожидающий** run/job: когда в группу встаёт следующий, прежний ожидающий отменяется. Ожидающий **Rollback staging** отменится, если следом встанет deploy из нового push в `main`, и наоборот. Отменённая promotion безопасна: `:staging` просто не меняется.

Runbook:

1. Кто держит и ждёт группу: Actions → незавершённые runs **CI/CD** и **Rollback staging** (у job в очереди — ожидание concurrency group). Из CLI:

   ```bash
   gh run list --limit 20 --json databaseId,workflowName,headBranch,event,status,createdAt \
     --jq '.[] | select(.status != "completed")'
   gh run view <run-id>   # jobs и их статус
   ```

2. Отменить лишний ожидающий run (например, deploy, который перезатрёт нужный rollback): Actions → run → **Cancel workflow** или `gh run cancel <run-id>`.
3. Перезапустить run, отменённый до выката (`Deploy staging` в нём не выполнялся): Actions → run → **Re-run all jobs** или `gh run rerun <run-id>`; для Rollback можно запустить новый Run workflow. Если `Deploy staging` в этом run уже выполнялся, **Re-run all jobs** нельзя, только **Re-run failed jobs** (§2.1).

Для **CI/CD** run из `main` повтор **Re-run all jobs** того же коммита заново собирает `runtime`: digest может измениться, `:<sha>` — перейти на новый образ, а следующий выкат — сдвинуть `.deploy-state.previous` и `:staging-previous` даже без изменения кода. Если выкат в этом run уже выполнялся, не перезапускайте все jobs. В PR-run jobs push и deploy пропускаются, поэтому повторная сборка PR не перезаписывает тег в GHCR и не выкатывает образ. **Re-run failed jobs** избегает новой сборки только тогда, когда среди повторяемых jobs нет **Docker image build**; проверьте состав повторного запуска перед выбором. Для точного отката храните digest последнего исправного образа: его источник — строка `pushed ghcr.io/…@sha256:…` в логе job `Push Docker image` (§6).

На инцидент:

1. Заморозить merge в `main`.
2. Запустить **Rollback staging** (ветка `main`).
3. Если run показал `cancelled` — перезапустить (шаг 3 выше).
4. Снять заморозку после зелёного rollback и внешней проверки.

---

## 8. GitHub configuration

### Organization — курсовой VPS

Заданы курсом на уровне организации, одинаковы в репозиториях API и UI.

| Имя                | Тип      | Зачем                                                       |
| ------------------ | -------- | ----------------------------------------------------------- |
| `VPS_DMC268_IP_T6` | variable | IPv4 курсового VPS, SSH на порт 22                          |
| `VPS_DMC268_U`     | secret   | SSH-пользователь                                            |
| `VPS_DMC268_P`     | secret   | SSH-пароль; уходит только на VPS, никогда на Terraform-хост |
| `AI_DMC268_T6`     | secret   | LLM-ключ приложения; CI его не использует                   |

### Repository variables

Заводит владелец репозитория.

| Variable                  | Обязателен            | Значение                                                                                                                                                                          |
| ------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STAGING_SSH_FINGERPRINT` | да, для обеих целей   | `SHA256:…` ECDSA host key VPS: `ssh-keyscan -t ecdsa -p 22 <VPS_DMC268_IP_T6> 2>/dev/null \| ssh-keygen -lf - -E sha256`. Значение в Environment `staging` перекрывает repository |
| `APP_DOMAIN`              | да, для курсового VPS | `dmc268-t6.axyi.ru` — базовый домен маршрутов edge-прокси                                                                                                                         |
| `VITE_GITHUB_CLIENT_ID`   | да, для входа         | Client ID зарегистрированного GitHub App (пробрасывается в `build-args` при сборке Docker-образа)                                                                                 |
| `VITE_GITHUB_APP_SLUG`    | да, для подключения   | Slug зарегистрированного GitHub App для формирования ссылки установки приложения (пробрасывается в `build-args` при сборке Docker-образа)                                         |
| `VITE_DOCS_URL`           | нет                   | адрес документации для пункта «Документация» в меню пользователя (`build-args` образа UI); пусто — `https://staging.dmc268-t6.axyi.ru/docs`, иначе только `http(s)://` URL        |

### Environment `staging`

Jobs `deploy-staging`, `promote-staging` (CI/CD) и workflow Rollback ссылаются на `environment: staging`.

1. **Deployment branches and tags** → только `main`. Rollback и сам пропускает jobs вне `refs/heads/main`, но branch policy закрывает secrets environment для любой другой ветки и workflow.
2. **Required reviewers — не включать.** `deploy-staging` и `promote-staging` оба входят в `staging`, поэтому каждый выкат запросил бы подтверждение дважды, а job, ожидающий подтверждения, возможно, держит группу `staging-deploy` и блокирует rollback (не проверено). Контроль — branch policy `main` и review PR.
3. Secrets и variables нужны только для Terraform-хоста (для курсового VPS хватает organization и repository значений):

| Имя                       | Тип      | Значение                                                                                                              |
| ------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `STAGING_SSH_KEY`         | secret   | приватный ключ к `hcloud_ssh_key.ci` из Terraform                                                                     |
| `STAGING_HOST`            | variable | IPv4 или FQDN из Terraform output `ssh_host` (стек `ui-staging`); пусто → курсовой VPS                                |
| `STAGING_SSH_PORT`        | variable | Terraform output `ssh_port` (`22022`); без него jobs с SSH падают первым шагом                                        |
| `STAGING_SSH_USER`        | variable | пользователь с Docker (`root` после cloud-init)                                                                       |
| `STAGING_SSH_FINGERPRINT` | variable | ECDSA host key Terraform-хоста: `ssh-keyscan -t ecdsa -p <ssh_port> <host> 2>/dev/null \| ssh-keygen -lf - -E sha256` |
| `STAGING_HEALTH_URL`      | variable | необязательно; иначе `http://<STAGING_HOST>/health`                                                                   |

`GITHUB_TOKEN` выдаёт Actions сам — в репозиторий его не кладут. `ACTIONS_STEP_DEBUG` / `ACTIONS_RUNNER_DEBUG` для `staging` не включать: отладочные логи могут повторить переданные на SSH переменные.

### Ruleset `main` — обязательные проверки

Ruleset `Protect Default Branch` меняет только администратор репозитория. Правило `required_status_checks` не даёт смёржить PR, пока не зелёные все три проверки:

| Required check             | Job в `ci-cd.yml`    | Что не пропускает в `main`                                                                                                                                                                        |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UI quality`               | `ui-quality`         | файл в `docs/plans`, ошибку eslint или stylelint, ошибку типов, неотформатированный файл, падающий тест, сломанную сборку, бандл с mock/demo-кодом или нарушенным порядком zod `jitless`          |
| `Production browser smoke` | `prod-browser-smoke` | сборку без моков, которая в Chromium не открывает экран входа или страницу репозиториев, бросает ошибку страницы, оставляет пустой React root либо статически импортирует app chunk из `vendor-*` |
| `Docker image build`       | `docker-build`       | образ UI, лендинга или документации, который не собирается; образ UI, не прошедший смоук                                                                                                          |

- Ruleset сверяет check по имени: оно должно буквально совпадать с `name:` у job. Переименовали job без правки ruleset — проверка с прежним именем не приходит, и все PR блокируются. Имя job и ruleset меняются вместе.
- Check добавляется в ruleset с источником GitHub Actions, как `Docker image build`: без источника требование закроет любой commit status с тем же именем.
- Включён `strict_required_status_checks_policy`: ветка PR должна быть актуальна относительно `main`, иначе merge недоступен даже с зелёными проверками.
- `[skip ci]` в сообщении head-коммита PR пропускает workflow целиком: обязательные проверки остаются в ожидании, и merge заблокирован до следующего коммита без этой метки.
- `Production browser smoke` отдельно собирает приложение с `VITE_USE_MOCKS=false`, запускает `pnpm smoke:prod-app` после сборки и проверяет production bundle в Chromium через Vite preview. Первый проход открывает `/` без сессии и требует экран входа; второй открывает защищённый `/repositories` в новой странице с валидными ответами только для `/api/auth/refresh`, `/api/auth/me` и `/api/repos`, требуя саму страницу репозиториев и сохранённый URL. Ошибка страницы (`pageerror`), пустой React root или небезопасный статический импорт app chunk из `vendor-*` краснит job. Обязательным check стал по решению техлида в ui#160. Job стоит в `needs` у `Push Docker image`: с красным смоуком образ не пушится и staging не выкатывается. Для локального запуска установите Chromium shell командой `pnpm exec playwright install --only-shell chromium`.
- Шесть базовых локальных гейтов: `pnpm lint && pnpm check-types && pnpm format:check && pnpm test && pnpm build && pnpm verify:prod-bundle`. Дополнительная браузерная проверка после сборки без моков: `VITE_USE_MOCKS=false pnpm build && pnpm smoke:prod-app`.

---

## 9. Локальные команды

Локальная сборка без GitHub Actions cache не воспроизводит повторное использование слоёв в CI: повторный локальный Docker build тоже использует свой кэш и может пропустить `apk upgrade`. Команды ниже через Buildx отключают кэш только для стадии `runtime` и загружают образы в локальное хранилище для Trivy и `docker run`. Успешная локальная сборка сама по себе не доказывает, что CI выполнил `apk upgrade`: проверяйте вывод `apk` в шаге `runtime` лога **Docker image build** (§1).

```bash
docker buildx build --load --no-cache-filter runtime -t dmc-268-ui:local .
trivy image --severity CRITICAL,HIGH --ignore-unfixed --scanners vuln,secret,misconfig --exit-code 1 dmc-268-ui:local
docker run --rm -p 8080:8080 dmc-268-ui:local
curl -fsS http://127.0.0.1:8080/health
pnpm smoke:image dmc-268-ui:local

# лендинг: контекст — корень репозитория, APP_URL обязателен
docker buildx build --load --no-cache-filter runtime -f landing/Dockerfile -t dmc-268-landing:local .
trivy image --severity CRITICAL,HIGH --ignore-unfixed --scanners vuln,secret,misconfig --exit-code 1 dmc-268-landing:local
docker run --rm -p 8081:8080 -e APP_URL=https://staging-ui.dmc268-t6.axyi.ru dmc-268-landing:local
curl -fsS http://127.0.0.1:8081/health
curl -fsS http://127.0.0.1:8081/config.json

# документация: контекст — корень репозитория, всё под /docs
docker buildx build --load --no-cache-filter runtime -f docs-site/Dockerfile -t dmc-268-docs:local .
trivy image --severity CRITICAL,HIGH --ignore-unfixed --scanners vuln,secret,misconfig --exit-code 1 dmc-268-docs:local
docker run --rm -p 8082:8080 dmc-268-docs:local
curl -fsS http://127.0.0.1:8082/docs/health
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8082/docs/quickstart
```
