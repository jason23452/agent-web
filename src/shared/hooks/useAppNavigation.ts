import { useCallback, useEffect, useState } from "react"
import {
  getProjectRouteName,
  getRoutePath,
  readBrowserRoute,
  type AppRoute,
} from "@/shared/utils/appRouterUtils"

export function useAppNavigation() {
  const [route, setRoute] = useState<AppRoute>(() => readBrowserRoute())

  useEffect(() => {
    function syncRouteFromBrowser() {
      const nextRoute = readBrowserRoute()
      const nextPath = getRoutePath(nextRoute)
      setRoute(nextRoute)
      if (`${window.location.pathname}${window.location.search}` !== nextPath) window.history.replaceState(null, "", nextPath)
    }

    syncRouteFromBrowser()
    window.addEventListener("popstate", syncRouteFromBrowser)
    return () => window.removeEventListener("popstate", syncRouteFromBrowser)
  }, [])

  const navigateToRoute = useCallback((nextRoute: AppRoute, options?: { replace?: boolean }) => {
    const nextPath = getRoutePath(nextRoute)
    setRoute(nextRoute)
    if (`${window.location.pathname}${window.location.search}` === nextPath) return
    if (options?.replace) window.history.replaceState(null, "", nextPath)
    else window.history.pushState(null, "", nextPath)
  }, [])

  const navigateToWorkspaceProject = useCallback((projectName: string, options?: { replace?: boolean }) => {
    navigateToRoute({ name: "workspaceProject", projectName }, options)
  }, [navigateToRoute])

  const changeProject = useCallback((projectPath: string) => {
    navigateToWorkspaceProject(getProjectRouteName(projectPath))
  }, [navigateToWorkspaceProject])

  const navigateToWorkflows = useCallback((projectName?: string, options?: { replace?: boolean }) => {
    navigateToRoute({ name: "workflows", ...(projectName ? { projectName } : {}) }, options)
  }, [navigateToRoute])

  const navigateToExtension = useCallback((projectName: string, extensionId: string, options?: { filePath?: string; replace?: boolean }) => {
    navigateToRoute({ extensionId, ...(options?.filePath ? { filePath: options.filePath } : {}), name: "extension", projectName }, options)
  }, [navigateToRoute])

  return { changeProject, navigateToExtension, navigateToRoute, navigateToWorkflows, navigateToWorkspaceProject, route }
}
