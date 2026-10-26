import { ScreenImage } from './screen-image'

export function RunsListMock() {
  return (
    <ScreenImage
      caption="The runs list. Status values are shown as the raw API names."
      centerCaption
      name="runs"
      alt="Screenshot of the Runs page in the Reviewer dashboard: a table of reviewed pull requests with repository, review status and engine."
    />
  )
}

export function RunDetailMock() {
  return (
    <ScreenImage
      caption="A finished run: three stages, the review session on the left, the diff with findings on the right."
      centerCaption
      name="run-detail"
      alt="Screenshot of a run page in the Reviewer dashboard: run details, the list of review steps and a diff with two findings."
    />
  )
}

export function AutoReviewSnippet() {
  return (
    <ScreenImage
      caption="The Automatic review switch."
      name="settings-auto-review"
      alt="Screenshot of the Automatic review switch in repository settings, with its hint."
      note="The hint under the switch is the app's own wording. Today a pull request still needs the ai-review label, see above."
    />
  )
}

export function RagSnippet() {
  return (
    <ScreenImage
      caption="The RAG switch with the index status."
      name="settings-rag"
      alt="Screenshot of the RAG section in repository settings: the switch and the index status."
      note="The hint under the switch is the app's own wording. Today the index does not change the review and adds no model cost, see above."
    />
  )
}

export function ReviewOptionsSnippet() {
  return (
    <ScreenImage
      caption="CI waiting, comment limit and verdict."
      name="settings-review-options"
      alt="Screenshot of three repository settings: CI waiting, comment limit and verdict."
    />
  )
}

export function BranchesSeveritySnippet() {
  return (
    <ScreenImage
      caption="Branch filter and severity threshold."
      name="settings-branches-severity"
      alt="Screenshot of the branch filter and severity threshold settings."
    />
  )
}

export function RulesSnippet() {
  return (
    <ScreenImage
      caption="How your .review/rules.md shows up in repository settings."
      name="settings-rules"
      alt="Screenshot of the Review rules panel: the file status, its text and the ignored paths."
    />
  )
}
