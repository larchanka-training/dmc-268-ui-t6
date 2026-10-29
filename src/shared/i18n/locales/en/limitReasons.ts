/**
 * The nine limit phrases of the run alert and the runs list. English follows `reasons.ts`.
 * The Russian side is word for word from the api check-run texts.
 */
export const limitReasons = {
  budget_paused: 'The daily budget is used up, reviews are paused.',
  budget_exceeded: 'The run hit its spending limit. Split the pull request.',
  deadline_exceeded: 'The run took too long. Restart it.',
  llm_context_overflow: 'The change does not fit in the model context. Split the pull request.',
  llm_rate_limited: 'The model provider limited the request rate. Restart the run later.',
  verification_budget_exceeded: 'The budget is not enough for the required check.',
  verification_deadline_exceeded: 'There is not enough time for the required check.',
  verification_context_overflow: 'The data the check needs does not fit in the context.',
  publication_payload_too_large: 'The result is over the publication limit of the code host.',
}
