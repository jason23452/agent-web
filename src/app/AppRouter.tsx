import { useCallback, useEffect, useState } from "react"
import { HOME_ROUTE_PATH, HomeRoute } from "@/features/home/router"
import { fileTree, recentProjects, starterAttachments, tokenUsage } from "@/app/data/mockWorkspace"
import { listProjectPrimaryAgents } from "@/features/workspace/api/agents"
import { createManagedProject, deleteManagedProject, getManagedProjectStatus, listManagedProjects, toWorkspaceProject } from "@/features/workspace/api/projects"
import { listProjectSessions, toWorkspaceSession } from "@/features/workspace/api/sessions"
import { WorkspaceProjectRoute, WORKSPACE_PROJECT_ROUTE_PREFIX } from "@/features/workspace/router/[name]"
import { WORKSPACE_ROUTE_PATH, WorkspaceRoute } from "@/features/workspace/router"
import { ApiError, getApiErrorMessage } from "@/shared/api"
import type { Agent, Attachment, FileNode, PinContext, Project, Session } from "@/shared/types/workspace"
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

const EMPTY_AGENT: Agent = {
  id: "no-primary-agent",
  name: "無 primary agent",
  provider: "OpenCode",
  status: "idle",
}

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
  const [activeAgentId, setActiveAgentId] = useState("")
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [pinContext, setPinContext] = useState<PinContext | null>(null)
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null)
  const [projects, setProjects] = useState<Project[]>(recentProjects)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectSessions, setProjectSessions] = useState<Session[]>([])
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)
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
    if (!checkedProjectName) {
      const timeoutId = window.setTimeout(() => {
        setActiveSessionId(null)
        setActiveAgentId("")
        setAvailableAgents([])
        setAgentsError(null)
        setAgentsLoading(false)
        setProjectSessions([])
        setSessionsError(null)
        setSessionsLoading(false)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setSessionsLoading(true)
      setSessionsError(null)
      setAgentsLoading(true)
      setAgentsError(null)

      void getManagedProjectStatus(checkedProjectName, { signal: controller.signal })
        .then(async (response) => {
          if (controller.signal.aborted) return
          const project = toWorkspaceProject(response.project)
          const directory = response.project.sdkDirectory || response.project.path

          setProjects((current) => {
            const nextProjects = current.filter((item) => item.id !== project.id)
            return [project, ...nextProjects]
          })

          const [sessionsResponse, agentsResponse] = await Promise.all([
            listProjectSessions(directory, { signal: controller.signal }).catch((error) => {
              if (!controller.signal.aborted) setSessionsError(getApiErrorMessage(error))
              return null
            }),
            listProjectPrimaryAgents(directory, { signal: controller.signal }).catch((error) => {
              if (!controller.signal.aborted) setAgentsError(getApiErrorMessage(error))
              return null
            }),
          ])
          if (controller.signal.aborted) return

          if (sessionsResponse) {
            const nextSessions = sessionsResponse.map(toWorkspaceSession)
            setProjectSessions(nextSessions)
            setActiveSessionId((current) => current && nextSessions.some((session) => session.id === current) ? current : nextSessions[0]?.id ?? null)
          } else {
            setProjectSessions([])
            setActiveSessionId(null)
          }

          if (agentsResponse) {
            setAvailableAgents(agentsResponse)
            setActiveAgentId((current) => current && agentsResponse.some((agent) => agent.id === current) ? current : agentsResponse[0]?.id ?? "")
          } else {
            setAvailableAgents([])
            setActiveAgentId("")
          }
        })
        .catch((error) => {
          if (controller.signal.aborted) return

          if (error instanceof ApiError && error.status === 404) {
            navigateToRoute({ name: "workspace" }, { replace: true })
            return
          }

          setProjectSessions([])
          setSessionsError(getApiErrorMessage(error))
          setAvailableAgents([])
          setAgentsError(getApiErrorMessage(error))
        })
        .finally(() => {
          if (!controller.signal.aborted) setSessionsLoading(false)
          if (!controller.signal.aborted) setAgentsLoading(false)
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
  const activeAgent = availableAgents.find((agent) => agent.id === activeAgentId) ?? availableAgents[0] ?? EMPTY_AGENT

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

  const createSession = useCallback(async () => {
    if (!checkedProjectName || !activeProjectPath) {
      setSessionsError("請先選擇專案後再建立對話。")
      navigateToRoute({ name: "workspace" }, { replace: true })
      return
    }

    setSessionsError(null)
    setActiveSessionId(null)
    navigateToWorkspaceProject(checkedProjectName)
    setSidebarOpen(false)
    setContextPanelOpen(false)
  }, [activeProjectPath, checkedProjectName, navigateToRoute, navigateToWorkspaceProject])

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

  function selectSession(sessionId: string) {
    setActiveSessionId(sessionId)
    closeMobileSurfaces()
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
          activeSessionId={activeSessionId}
          onCreateProject={createProject}
          onCreateSession={createSession}
          onDeleteProject={deleteProject}
          onClose={() => setSidebarOpen(false)}
          onProjectChange={changeProject}
          onRefreshProjects={refreshProjects}
          onSelectSession={selectSession}
          open={sidebarOpen}
          projects={projects}
          projectsError={projectsError}
          projectsLoading={projectsLoading}
          sessions={projectSessions}
          sessionsError={sessionsError}
          sessionsLoading={sessionsLoading}
        />
      }
      sidebarOpen={sidebarOpen}
      topNav={
        <AppTopbar
          activeAgent={activeAgent}
          activeProjectPath={route.name === "workspaceProject" ? activeProjectPath : null}
          agents={availableAgents}
          agentsError={agentsError}
          agentsLoading={agentsLoading}
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
