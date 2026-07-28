import { useEffect } from "react"
import { recentProjects } from "@/features/workspace/data/mockWorkspace"

export const WORKSPACE_ROUTE_PATH = "/workspace"

type WorkspaceRouteProps = {
  onProjectNameChange: (projectName: string, options?: { replace?: boolean }) => void
}

function getProjectRouteName(projectPath: string) {
  const normalizedPath = projectPath.replace(/\\/g, "/").replace(/\/+$/, "")
  const name = normalizedPath.split("/").filter(Boolean).at(-1)

  return name || "project"
}

export function WorkspaceRoute({ onProjectNameChange }: WorkspaceRouteProps) {
  useEffect(() => {
    onProjectNameChange(getProjectRouteName(recentProjects[0]?.path ?? "/workspace/test-web/"), { replace: true })
  }, [onProjectNameChange])

  return null
}
