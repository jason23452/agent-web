import { useCallback, useEffect, useState } from "react"
import { HOME_ROUTE_PATH, HomeRoute } from "@/features/home/router"
import { agents, fileTree, recentProjects, sessions, starterAttachments, tokenUsage } from "@/app/data/mockWorkspace"
import { createManagedProject, deleteManagedProject, getManagedProjectStatus, listManagedProjects, toWorkspaceProject } from "@/features/workspace/api/projects"
import { WorkspaceProjectRoute, WORKSPACE_PROJECT_ROUTE_PREFIX } from "@/features/workspace/router/[name]"
import { WORKSPACE_ROUTE_PATH, WorkspaceRoute } from "@/features/workspace/router"
import { ApiError, getApiErrorMessage } from "@/shared/api"
import type { Attachment, FileNode, PinContext, Project } from "@/shared/types/workspace"
import { AppContextPanel } from "@/shared/components/layout/AppContextPanel"
import { AppFilePreviewDialog } from "@/shared/components/layout/AppFilePreviewDialog"
import { AppShell } from "@/shared/components/layout/AppShell"
import { AppSidebar } from "@/shared/components/layout/AppSidebar"
import { AppTopbar } from "@/shared/components/layout/AppTopbar"
import { ChatComposer } from "@/shared/components/layout/ChatComposer"

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

function getProjectPath(name: string, projects: Project[]) {
  const matchedProject = projects.find((project) => {
    return project.id === name || project.name === name || getProjectRouteName(project.path) === name
  })

  return matchedProject?.path ?? `/workspace/projects/${name}`
}

export function AppRouter() {
  const [route, setRoute] = useState<AppRoute>(() => readBrowserRoute())
  const [activeAgentId, setActiveAgentId] = useState(agents[0]!.id)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [pinContext, setPinContext] = useState<PinContext | null>(null)
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null)
  const [projects, setProjects] = useState<Project[]>(recentProjects)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(false)
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

  const checkedProjectName = route.name === "workspaceProject" ? route.projectName : null

  const refreshProjects = useCallback(async () => {
    setProjectsLoading(true)
    setProjectsError(null)

    try {
      const response = await listManagedProjects()
      setProjects(response.projects.map(toWorkspaceProject))
    } catch (error) {
      setProjectsError(getApiErrorMessage(error))
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshProjects()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [refreshProjects])

  useEffect(() => {
    if (!checkedProjectName) return

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      void getManagedProjectStatus(checkedProjectName, { signal: controller.signal }).catch((error) => {
        if (controller.signal.aborted) return

        if (error instanceof ApiError && error.status === 404) {
          navigateToRoute({ name: "workspace" }, { replace: true })
          return
        }

        setProjectsError(getApiErrorMessage(error))
      })
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [checkedProjectName, navigateToRoute])

  const defaultProjectPath = projects[0]?.path ?? recentProjects[0]?.path ?? "/workspace/projects/test-web"
  const defaultProjectName = getProjectRouteName(defaultProjectPath)
  const activeProjectName = checkedProjectName ?? defaultProjectName
  const activeProjectPath = checkedProjectName ? getProjectPath(activeProjectName, projects) : ""
  const activeAgent = agents.find((agent) => agent.id === activeAgentId) ?? agents[0]!

  const createProject = useCallback(async (name: string) => {
    const response = await createManagedProject({
      displayName: name,
      initializeReadme: true,
      name,
    })
    const nextProject = toWorkspaceProject(response.project)

    setProjects((current) => [
      nextProject,
      ...current.filter((project) => project.id !== nextProject.id),
    ])
    setProjectsError(null)

    return nextProject
  }, [])

  const deleteProject = useCallback(async (project: Project) => {
    await deleteManagedProject(project.name)

    const nextProjects = projects.filter((item) => item.id !== project.id)
    setProjects(nextProjects)
    setProjectsError(null)

    const deletedRouteName = getProjectRouteName(project.path)
    const deletedActiveProject =
      route.name === "workspaceProject" &&
      (route.projectName === project.name || route.projectName === deletedRouteName)

    if (!deletedActiveProject) return

    navigateToRoute({ name: "workspace" }, { replace: true })
  }, [navigateToRoute, projects, route])

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
      <WorkspaceRoute />
    ) : route.name === "workspaceProject" ? (
      <WorkspaceProjectRoute />
    ) : (
      <HomeRoute />
    )

  return (
    <AppShell
      ariaLabel="AICaht agent workspace"
      aside={<AppContextPanel fileTree={fileTree} open={contextPanelOpen} onClose={() => setContextPanelOpen(false)} onPreviewFile={setPreviewFile} />}
      asideOpen={contextPanelOpen}
      composer={
        <ChatComposer
          attachments={attachments}
          onAddAttachment={addAttachment}
          onClearPin={() => setPinContext(null)}
          onRemoveAttachment={removeAttachment}
          pinContext={pinContext}
        />
      }
      onCloseAside={() => setContextPanelOpen(false)}
      onCloseSidebar={() => setSidebarOpen(false)}
      sidebar={
        <AppSidebar
          activeProjectPath={activeProjectPath}
          onCreateProject={createProject}
          onDeleteProject={deleteProject}
          onClose={() => setSidebarOpen(false)}
          onProjectChange={changeProject}
          onRefreshProjects={refreshProjects}
          onSelectSession={closeMobileSurfaces}
          open={sidebarOpen}
          projects={projects}
          projectsError={projectsError}
          projectsLoading={projectsLoading}
          sessions={sessions}
        />
      }
      sidebarOpen={sidebarOpen}
      topNav={
        <AppTopbar
          activeAgent={activeAgent}
          activeProjectPath={route.name === "workspaceProject" ? activeProjectPath : null}
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
