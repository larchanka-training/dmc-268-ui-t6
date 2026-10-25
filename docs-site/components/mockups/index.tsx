import { DashboardFrame } from './dashboard-frame'

export function RepositorySettingsMock() {
  return (
    <DashboardFrame
      caption="Repository settings: auto-review, RAG with the index status, review options and the rules file."
      height={1576}
      screen="settings"
    />
  )
}

export function RunsListMock() {
  return (
    <DashboardFrame
      caption="The runs list. Status values are shown as the raw API names."
      height={712}
      screen="runs"
    />
  )
}

export function RunDetailMock() {
  return (
    <DashboardFrame
      caption="A finished run: three stages, the review session on the left, the diff with findings on the right."
      height={1120}
      screen="run-detail"
    />
  )
}
