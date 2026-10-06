## Contract note for larchanka-training/dmc-268-api-t6#20 (Refs dmc-268-ui-t6#65)

UI run detail (`dmc-268-ui-t6` #70 / #65) consumes the run session contract as in
`docs/FRONTEND_ARCHITECTURE.md` §2:

- `GET /runs/{id}` (`RunDetail`, including `findings[]`)
- `GET /runs/{id}/comments`, `/files`, `/actions`, `/rerun`, `/cancel`
- SSE `GET /stream` (`run.updated`)

Invalid items in `findings[]` are dropped via `FindingViewSchema.safeParse` (soft parse).
No OpenAPI field renames in this change set.

Posted: https://github.com/larchanka-training/dmc-268-api-t6/issues/20#issuecomment-6016069919
