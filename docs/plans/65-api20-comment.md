## Contract note for larchanka-training/dmc-268-api-t6#20 (Refs dmc-268-ui-t6#65)

UI run detail now tolerates invalid entries in `findings[]` (drops items that fail `FindingViewSchema`).
Run page consumes `GET /runs/{id}/comments`, `/files`, `/actions`, `/rerun`, `/cancel`, and SSE
`GET /stream` as documented in `docs/FRONTEND_ARCHITECTURE.md` §2.

No OpenAPI field renames in this change set; post a copy of this note on api#20 when merging UI PR-3.
