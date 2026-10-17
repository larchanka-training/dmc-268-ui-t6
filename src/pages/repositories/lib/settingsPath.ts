/** Address of the settings page of one repository (`/repositories/:repoId/settings`). */
export function repositorySettingsPath(id: string): string {
  return `/repositories/${id}/settings`
}
