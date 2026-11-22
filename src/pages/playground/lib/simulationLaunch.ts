/** The simulation the playground follows. */
export interface SimulationLaunch {
  id: string
  /** The repository that pays, as it was when sent; null for one taken over from a `409`. */
  repositoryName: string | null
}
