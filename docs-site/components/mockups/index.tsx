import { ScreenImage } from './screen-image'

export function RunsListMock() {
  return (
    <ScreenImage
      caption="The runs list. Status values are shown as the raw API names."
      centerCaption
      name="runs"
    />
  )
}

export function RunDetailMock() {
  return (
    <ScreenImage
      caption="A finished run: three stages, the review session on the left, the diff with findings on the right."
      centerCaption
      name="run-detail"
    />
  )
}

export function AutoReviewSnippet() {
  return <ScreenImage caption="The Automatic review switch." name="settings-auto-review" />
}

export function RagSnippet() {
  return <ScreenImage caption="The RAG switch with the index status." name="settings-rag" />
}

export function ReviewOptionsSnippet() {
  return (
    <ScreenImage caption="CI waiting, comment limit and verdict." name="settings-review-options" />
  )
}

export function BranchesSeveritySnippet() {
  return (
    <ScreenImage
      caption="Branch filter and severity threshold."
      name="settings-branches-severity"
    />
  )
}

export function RulesSnippet() {
  return (
    <ScreenImage
      caption="How your .review/rules.md shows up in repository settings."
      name="settings-rules"
    />
  )
}
