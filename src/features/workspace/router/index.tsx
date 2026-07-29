import { useEffect } from "react"

export const WORKSPACE_ROUTE_PATH = "/workspace"

type WorkspaceRouteProps = {
  defaultProjectPath: string
  onProjectNameChange: (projectName: string, options?: { replace?: boolean }) => void
}

function getProjectRouteName(projectPath: string) {
  const normalizedPath = projectPath.replace(/\\/g, "/").replace(/\/+$/, "")
  const name = normalizedPath.split("/").filter(Boolean).at(-1)

  return name || "project"
}

export function WorkspaceRoute({ defaultProjectPath, onProjectNameChange }: WorkspaceRouteProps) {
  useEffect(() => {
    onProjectNameChange(getProjectRouteName(defaultProjectPath), { replace: true })
  }, [defaultProjectPath, onProjectNameChange])

  return null
}
