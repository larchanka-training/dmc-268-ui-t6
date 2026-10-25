import { DashboardFrame } from './dashboard-frame'
import { SnippetFrame } from './snippet-frame'

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

export function AutoReviewSnippet() {
  return (
    <SnippetFrame
      caption="The Automatic review switch."
      height={100}
      snippet="settings-auto-review"
    />
  )
}

export function RagSnippet() {
  return (
    <SnippetFrame
      caption="The RAG switch with the index status."
      height={150}
      snippet="settings-rag"
    />
  )
}

export function ReviewOptionsSnippet() {
  return (
    <SnippetFrame
      caption="CI waiting, comment limit and verdict."
      height={264}
      snippet="settings-review-options"
    />
  )
}

export function BranchesSeveritySnippet() {
  return (
    <SnippetFrame
      caption="Branch filter and severity threshold."
      height={360}
      snippet="settings-branches-severity"
    />
  )
}

export function RulesSnippet() {
  return (
    <SnippetFrame
      caption="How your .review/rules.md shows up in repository settings."
      height={500}
      maxWidth={640}
      snippet="settings-rules"
    />
  )
}
