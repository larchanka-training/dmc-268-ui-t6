import { MockShell, mockStyles as s } from './shell'

/** Repository settings page, labels from src/features/repository-settings/ui/*. */
export function RepositorySettingsMock() {
  return (
    <MockShell
      active="repositories"
      path="/repositories/…/settings"
      caption="Repository settings: auto-review, RAG with index status, review options and the rules file status."
    >
      <div className={s.crumbs}>Репозитории / Настройки</div>
      <div className={s.header}>
        <div>
          <h3 className={s.title}>Настройки репозитория</h3>
          <p className={s.desc}>acme/api</p>
        </div>
        <span className={s.button}>История проверок</span>
      </div>

      <div className={s.card}>
        <div className={s.row}>
          <div>
            <div className={s.label}>Автоматическое ревью</div>
            <p className={s.hint}>
              Когда включено, ревью запускается автоматически для pull request этого репозитория.
            </p>
          </div>
          <span className={s.switch} data-on />
        </div>
        <div className={s.row}>
          <div>
            <div className={s.label}>RAG</div>
            <p className={s.hint}>
              Учитывает связи между файлами репозитория, делая ревью точнее. Может увеличить
              стоимость. Хранится только структура кода, не его текст.
            </p>
          </div>
          <span className={s.switch} data-on />
        </div>
        <div className={s.muted}>
          Статус индекса:{' '}
          <span className={s.tag} data-tone="success">
            Готов
          </span>{' '}
          <span className={s.mono}>3f9c2a1</span> обновлён 2026-10-20 14:02:11
        </div>
      </div>

      <div className={s.card}>
        <div className={s.grid2}>
          <div className={s.field}>
            <span className={s.label}>Ожидание CI</span>
            <span className={s.input}>Авто (ожидать CI при наличии проверок)</span>
          </div>
          <div className={s.field}>
            <span className={s.label}>Лимит замечаний (1..10)</span>
            <span className={s.input}>5</span>
          </div>
          <div className={s.field}>
            <span className={s.label}>Публикация вердикта</span>
            <span className={s.input}>Запрос изменений (при блокирующих)</span>
          </div>
          <div className={s.field}>
            <span className={s.label}>Фильтр веток</span>
            <span className={`${s.input} ${s.mono}`}>main · release/*</span>
          </div>
        </div>
        <div className={s.field}>
          <span className={s.label}>Порог важности замечаний</span>
          <span className={s.segmented}>
            <span>All</span>
            <span data-active>Warn &amp; Crit</span>
            <span>Only Critical</span>
          </span>
        </div>
        <div className={s.row} style={{ justifyContent: 'flex-start' }}>
          <span className={`${s.button} ${s.primary}`}>Сохранить</span>
          <span className={s.button}>Отменить изменения</span>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.row}>
          <span className={s.label}>Правила ревью</span>
          <span className={s.tag} data-tone="success">
            Файл найден
          </span>
        </div>
        <div className={s.muted}>
          <span className={s.mono}>.review/rules.md</span> · main · Проверено: 2026-10-20 14:01:58
        </div>
      </div>
    </MockShell>
  )
}
