<!-- SYNC: mirrored in dmc-268-{ui,api}-t6/.agents/skills/issue-graph/tests/golden/cycle.md -->

### Граф задач: задачи [api#1](https://github.com/larchanka-training/dmc-268-api-t6/issues/1), [api#2](https://github.com/larchanka-training/dmc-268-api-t6/issues/2), [api#3](https://github.com/larchanka-training/dmc-268-api-t6/issues/3), [api#4](https://github.com/larchanka-training/dmc-268-api-t6/issues/4)

Задач: 4 (открыто 4, закрыто 0). Связей блокировки: 3. Вне выборки: 0.

```mermaid
flowchart LR
  api_1["api#35;1 Первый шаг цикла"]
  api_2["api#35;2 Второй шаг цикла"]
  api_3["api#35;3 Третий шаг цикла"]
  api_4["api#35;4 Свободная задача"]
  api_1 --> api_2
  api_2 --> api_3
  api_3 --> api_1
  classDef done fill:#f1f3f5,stroke:#adb5bd,color:#868e96
  classDef progress fill:#e7f5ff,stroke:#1c7ed6
  classDef review fill:#fff9db,stroke:#f08c00
  classDef alarm fill:#fff5f5,stroke:#e03131,stroke-width:3px
  classDef external fill:#ffffff,stroke:#868e96,stroke-dasharray:5 5
  class api_1,api_2,api_3 alarm
```

#### Циклы

- [api#1](https://github.com/larchanka-training/dmc-268-api-t6/issues/1) → [api#2](https://github.com/larchanka-training/dmc-268-api-t6/issues/2) → [api#3](https://github.com/larchanka-training/dmc-268-api-t6/issues/3) → [api#1](https://github.com/larchanka-training/dmc-268-api-t6/issues/1)

#### In Progress с открытым блокером

- [api#1](https://github.com/larchanka-training/dmc-268-api-t6/issues/1) ждёт [api#3](https://github.com/larchanka-training/dmc-268-api-t6/issues/3)

#### Слои: что можно брать параллельно

Не считаются: в графе цикл.

#### Критический путь

Не считается: в графе цикл.

#### Без связей

- [api#4](https://github.com/larchanka-training/dmc-268-api-t6/issues/4) [docs] Свободная задача

#### Вне выборки

Нет.
