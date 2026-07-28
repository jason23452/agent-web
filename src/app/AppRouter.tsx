import { useCallback, useEffect, useState } from "react"
import { HOME_ROUTE_PATH, HomeRoute } from "@/features/home/router"
import { agents, fileTree, messages, recentProjects, sessions, starterAttachments, tokenUsage } from "@/features/workspace/data/mockWorkspace"
import { WorkspaceProjectRoute, WORKSPACE_PROJECT_ROUTE_PREFIX } from "@/features/workspace/router/[name]"
import { WORKSPACE_ROUTE_PATH, WorkspaceRoute } from "@/features/workspace/router"
import type { Attachment, FileNode, PinContext } from "@/features/workspace/types/workspace"
import { AppContextPanel } from "@/shared/components/layout/AppContextPanel"
import { AppFilePreviewDialog } from "@/shared/components/layout/AppFilePreviewDialog"
import { AppShell } from "@/shared/components/layout/AppShell"
import { AppSidebar } from "@/shared/components/layout/AppSidebar"
import { AppTopbar } from "@/shared/components/layout/AppTopbar"

type AppRoute =
  | { name: "home" }
  | { name: "workspace" }
  | { name: "workspaceProject"; projectName: string }

function readBrowserRoute(): AppRoute {
  const pathname = window.location.pathname.replace(/\/+$/, "") || HOME_ROUTE_PATH

  if (pathname === WORKSPACE_ROUTE_PATH) {
    return { name: "workspace" }
  }

  if (pathname.startsWith(`${WORKSPACE_PROJECT_ROUTE_PREFIX}/`)) {
    const encodedProjectName = pathname.slice(`${WORKSPACE_PROJECT_ROUTE_PREFIX}/`.length).split("/")[0]
    if (!encodedProjectName) return { name: "workspace" }

    try {
      return { name: "workspaceProject", projectName: decodeURIComponent(encodedProjectName) }
    } catch {
      return { name: "workspace" }
    }
  }

  return { name: "home" }
}

function getRoutePath(route: AppRoute) {
  if (route.name === "workspace") return WORKSPACE_ROUTE_PATH
  if (route.name === "workspaceProject") return `${WORKSPACE_PROJECT_ROUTE_PREFIX}/${encodeURIComponent(route.projectName)}`

  return HOME_ROUTE_PATH
}

function getProjectRouteName(projectPath: string) {
  const normalizedPath = projectPath.replace(/\\/g, "/").replace(/\/+$/, "")
  const name = normalizedPath.split("/").filter(Boolean).at(-1)

  return name || "project"
}

function getProjectPath(name: string) {
  const matchedProject = recentProjects.find((project) => {
    return project.id === name || project.name === name || getProjectRouteName(project.path) === name
  })

  return matchedProject?.path ?? `/workspace/${name}/`
}

export function AppRouter() {
  const [route, setRoute] = useState<AppRoute>(() => readBrowserRoute())
  const [activeAgentId, setActiveAgentId] = useState(agents[0]!.id)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [pinContext, setPinContext] = useState<PinContext | null>(null)
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    function syncRouteFromBrowser() {
      const nextRoute = readBrowserRoute()
      const nextPath = getRoutePath(nextRoute)

      setRoute(nextRoute)

      if (window.location.pathname !== nextPath) {
        window.history.replaceState(null, "", nextPath)
      }
    }

    syncRouteFromBrowser()
    window.addEventListener("popstate", syncRouteFromBrowser)

    return () => window.removeEventListener("popstate", syncRouteFromBrowser)
  }, [])

  const navigateToRoute = useCallback((nextRoute: AppRoute, options?: { replace?: boolean }) => {
    const nextPath = getRoutePath(nextRoute)

    setRoute(nextRoute)
    if (window.location.pathname !== nextPath) {
      if (options?.replace) {
        window.history.replaceState(null, "", nextPath)
      } else {
        window.history.pushState(null, "", nextPath)
      }
    }
  }, [])

  const navigateToWorkspaceProject = useCallback((projectName: string, options?: { replace?: boolean }) => {
    navigateToRoute({ name: "workspaceProject", projectName }, options)
  }, [navigateToRoute])

  const defaultProjectName = getProjectRouteName(recentProjects[0]?.path ?? "/workspace/test-web/")
  const activeProjectName = route.name === "workspaceProject" ? route.projectName : defaultProjectName
  const activeProjectPath = getProjectPath(activeProjectName)
  const activeAgent = agents.find((agent) => agent.id === activeAgentId) ?? agents[0]!

  function addAttachment() {
    const next = starterAttachments.find((item) => !attachments.some((attachment) => attachment.id === item.id))
    if (next) setAttachments((current) => [...current, next])
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id))
  }

  function closeMobileSurfaces() {
    setSidebarOpen(false)
    setContextPanelOpen(false)
  }

  function changeProject(projectPath: string) {
    navigateToWorkspaceProject(getProjectRouteName(projectPath))
  }

  function pinPreviewContext(context: PinContext) {
    setPinContext(context)
    setPreviewFile(null)
  }

  const mainRoute =
    route.name === "workspace" ? (
      <WorkspaceRoute onProjectNameChange={navigateToWorkspaceProject} />
    ) : route.name === "workspaceProject" ? (
      <WorkspaceProjectRoute />
    ) : (
      <HomeRoute
        activeAgent={activeAgent}
        attachments={attachments}
        messages={messages}
        onAddAttachment={addAttachment}
        onClearPin={() => setPinContext(null)}
        onRemoveAttachment={removeAttachment}
        pinContext={pinContext}
      />
    )

  return (
    <AppShell
      ariaLabel="AICaht agent workspace"
      aside={<AppContextPanel fileTree={fileTree} open={contextPanelOpen} onClose={() => setContextPanelOpen(false)} onPreviewFile={setPreviewFile} />}
      asideOpen={contextPanelOpen}
      onCloseAside={() => setContextPanelOpen(false)}
      onCloseSidebar={() => setSidebarOpen(false)}
      sidebar={
        <AppSidebar
          activeProjectPath={activeProjectPath}
          onClose={() => setSidebarOpen(false)}
          onProjectChange={changeProject}
          onSelectSession={closeMobileSurfaces}
          open={sidebarOpen}
          projects={recentProjects}
          sessions={sessions}
        />
      }
      sidebarOpen={sidebarOpen}
      topNav={
        <AppTopbar
          activeAgent={activeAgent}
          activeProjectPath={activeProjectPath}
          agents={agents}
          onAgentChange={setActiveAgentId}
          onOpenContextPanel={() => setContextPanelOpen(true)}
          onOpenSidebar={() => setSidebarOpen(true)}
          tokenUsage={tokenUsage}
        />
      }
    >
      {mainRoute}
      <AppFilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} onPin={pinPreviewContext} />
    </AppShell>
  )
}
