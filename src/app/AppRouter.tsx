import { useCallback, useEffect, useState } from "react"
import { HomeRoute } from "@/features/home/router"
import { fileTree as mockFileTree, recentProjects, starterAttachments, tokenUsage } from "@/app/data/mockWorkspace"
import { createOrUpdateProjectFile, createProjectDirectory, deleteProjectFile, readProjectFileContent } from "@/features/workspace/api/files"
import { listProjectPrimaryAgents } from "@/features/workspace/api/agents"
import { createManagedProject, deleteManagedProject, getManagedProjectStatus, listManagedProjects, toWorkspaceProject } from "@/features/workspace/api/projects"
import { listProjectSessions, toWorkspaceSession } from "@/features/workspace/api/sessions"
import { WorkspaceProjectRoute } from "@/features/workspace/router/[name]"
import { WorkspaceRoute } from "@/features/workspace/router"
import { ApiError, getApiErrorMessage } from "@/shared/api"
import { restartOpenCodeRuntime } from "@/shared/api/opencodeRuntime"
import type { Agent, Attachment, FileNode, PinContext, Project, Session } from "@/shared/types/workspace"
import { AppContextPanel } from "@/shared/components/layout/AppContextPanel"
import { AppFilePreviewDialog } from "@/shared/components/layout/AppFilePreviewDialog"
import type { FileTreeNode } from "@/shared/components/layout/FileTree"
import { AppShell } from "@/shared/components/layout/AppShell"
import { AppSidebar } from "@/shared/components/layout/AppSidebar"
import { AppTopbar } from "@/shared/components/layout/AppTopbar"
import { ChatComposer } from "@/shared/components/layout/ChatComposer"
import {
  buildWorkspaceFileTree,
  combineRelativePath,
  decodeTextContent,
  getProjectPath,
  getProjectRouteName,
  getRestartInProgressOperation,
  getRoutePath,
  normalizeDirectoryInput,
  readBrowserRoute,
  readFileAsBase64,
  toRelativePath,
  type AppRoute,
  waitForOpenCodeRestartOperation,
  waitForOpenCodeRuntimeReady,
} from "@/app/appRouterUtils"

const EMPTY_AGENT: Agent = {
  id: "no-primary-agent",
  name: "無 primary agent",
  provider: "OpenCode",
  status: "idle",
}

const NO_ACTIVE_PROJECT_FILE_TREE_MESSAGE = "尚未啟用專案，請先到側邊欄開啟專案。"

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
  const [layoutLoading, setLayoutLoading] = useState(false)
  const [layoutLoadingLabel, setLayoutLoadingLabel] = useState("Loading...")
  const [projects, setProjects] = useState<Project[]>(recentProjects)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectSessions, setProjectSessions] = useState<Session[]>([])
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [contextFileTree, setContextFileTree] = useState<FileTreeNode[]>(mockFileTree)
  const [contextFileTreeLoading, setContextFileTreeLoading] = useState(false)
  const [contextFileTreeError, setContextFileTreeError] = useState<string | null>(null)
  const [contextFileTreeVersion, setContextFileTreeVersion] = useState(0)
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
  const activeProjectPath = checkedProjectName
    ? getProjectPath(activeProjectName, projects)
    : null
  const activeAgent = availableAgents.find((agent) => agent.id === activeAgentId) ?? availableAgents[0] ?? EMPTY_AGENT

  const openProjectFile = useCallback(async (file: FileTreeNode) => {
    if (!activeProjectPath) return

    const queryPath = toRelativePath(activeProjectPath, file.absolute || file.path || file.id)
    setPreviewFile({
      ...file,
      contentLoading: true,
      contentError: null,
      contentType: undefined,
    })

    try {
      const response = await readProjectFileContent(activeProjectPath, queryPath)

      setPreviewFile({
        ...file,
        content: response.type === "text" ? decodeTextContent(response.content, response.encoding) : undefined,
        contentType: response.type,
        contentLoading: false,
        contentError: null,
      })
    } catch (error) {
      setPreviewFile({
        ...file,
        contentLoading: false,
        contentError: error instanceof Error ? error.message : getApiErrorMessage(error),
        contentType: "text",
      })
    }
  }, [activeProjectPath])

  const triggerContextFileTreeReload = useCallback(() => {
    setContextFileTreeVersion((current) => current + 1)
  }, [])

  const createContextProjectFile = useCallback(async (directory: string, itemName?: string) => {
    if (!activeProjectPath) return

    const fileName = itemName ?? window.prompt("輸入新檔名", "")?.trim()
    if (!fileName) return

    const targetDirectory = combineRelativePath(directory, fileName)

    try {
      await createOrUpdateProjectFile({
        directory: activeProjectPath,
        path: targetDirectory,
        content: "",
      })

      setContextFileTreeError(null)
      triggerContextFileTreeReload()
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    }
  }, [activeProjectPath, triggerContextFileTreeReload])

  const createContextProjectFolder = useCallback(async (directory: string, itemName?: string) => {
    if (!activeProjectPath) return

    const folderName = itemName ?? window.prompt("輸入新資料夾名稱", "")?.trim()
    if (!folderName) return

    const targetDirectory = combineRelativePath(directory, folderName)

    try {
      await createProjectDirectory({
        directory: activeProjectPath,
        path: targetDirectory,
      })

      setContextFileTreeError(null)
      triggerContextFileTreeReload()
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    }
  }, [activeProjectPath, triggerContextFileTreeReload])

  const reloadContextFileTree = useCallback(async (directory: string, signal: AbortSignal) => {
    setContextFileTreeLoading(true)
    setContextFileTreeError(null)

    try {
      const tree = await buildWorkspaceFileTree(directory, signal)
      if (signal.aborted) return

      setContextFileTree(tree)
    } catch (error) {
      if (signal.aborted) return

      setContextFileTree(mockFileTree)
      setContextFileTreeError(
        error instanceof Error ? error.message : "讀取專案檔案樹失敗，將使用示例資料。",
      )
    } finally {
      if (!signal.aborted) {
        setContextFileTreeLoading(false)
      }
    }
  }, [])

  const deleteContextNode = useCallback(async (node: FileTreeNode) => {
    if (!activeProjectPath) return

    const nodePath = normalizeDirectoryInput(node.path || toRelativePath(activeProjectPath, node.absolute || node.id))
    if (!nodePath || nodePath === ".") {
      setContextFileTreeError("無法刪除此節點。")
      return
    }

    const isFolder = node.type === "folder"

    try {
      await deleteProjectFile({
        directory: activeProjectPath,
        path: nodePath,
        recursive: isFolder,
      })

      setContextFileTreeError(null)
      triggerContextFileTreeReload()
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    }
  }, [activeProjectPath, triggerContextFileTreeReload])

  const uploadContextFiles = useCallback(async (files: readonly File[], directory: string) => {
    if (!activeProjectPath) return

    const list = Array.from(files)
    if (list.length === 0) return

    setContextFileTreeLoading(true)

    try {
      const targetDirectory = normalizeDirectoryInput(directory)

      await Promise.all(
        list.map(async (item) => {
          const encoded = await readFileAsBase64(item)
          const filePath = combineRelativePath(targetDirectory, item.name)

          return createOrUpdateProjectFile({
            directory: activeProjectPath,
            path: filePath,
            content: encoded,
            encoding: "base64",
            overwrite: true,
          })
        }),
      )

      setContextFileTreeError(null)
      triggerContextFileTreeReload()
    } catch (error) {
      setContextFileTreeError(getApiErrorMessage(error))
    } finally {
      setContextFileTreeLoading(false)
    }
  }, [activeProjectPath, triggerContextFileTreeReload])

  const createProject = useCallback(async (name: string) => {
    const response = await createManagedProject({
      displayName: name,
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

  useEffect(() => {
    if (!activeProjectPath) {
      return
    }

    const directory = activeProjectPath

    const controller = new AbortController()

    Promise.resolve().then(() => reloadContextFileTree(directory, controller.signal))

    return () => controller.abort()
  }, [activeProjectPath, contextFileTreeVersion, reloadContextFileTree])

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

  const restartOpenCodeServer = useCallback(async (reason: string) => {
    setLayoutLoadingLabel("正在重新啟動 OpenCode server...")
    setLayoutLoading(true)

    try {
      try {
        await restartOpenCodeRuntime({ reason, wait: true })
      } catch (error) {
        const runningOperation = getRestartInProgressOperation(error)
        if (!runningOperation) throw error

        setLayoutLoadingLabel("OpenCode server 已在重新啟動，正在等待完成...")
        if (runningOperation.operationID) {
          await waitForOpenCodeRestartOperation(runningOperation.operationID)
        } else {
          await waitForOpenCodeRuntimeReady()
        }
      }

      if (!activeProjectPath) return

      setLayoutLoadingLabel("正在重新載入 OpenCode agents...")
      const nextAgents = await listProjectPrimaryAgents(activeProjectPath).catch((error) => {
        setAgentsError(getApiErrorMessage(error))
        return null
      })
      if (!nextAgents) return

      setAvailableAgents(nextAgents)
      setActiveAgentId((current) => current && nextAgents.some((agent) => agent.id === current) ? current : nextAgents[0]?.id ?? "")
    } finally {
      setLayoutLoading(false)
    }
  }, [activeProjectPath])

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

  const renderedContextFileTree = activeProjectPath ? contextFileTree : []
  const renderedContextFileTreeLoading = activeProjectPath ? contextFileTreeLoading : false
  const renderedContextFileTreeError = activeProjectPath
    ? contextFileTreeError
    : NO_ACTIVE_PROJECT_FILE_TREE_MESSAGE

  return (
    <AppShell
      ariaLabel="AICaht agent workspace"
      aside={
          <AppContextPanel
            fileTree={renderedContextFileTree}
            loading={renderedContextFileTreeLoading}
            message={renderedContextFileTreeError}
            projectActive={Boolean(activeProjectPath)}
            open={contextPanelOpen}
            onClose={() => setContextPanelOpen(false)}
            onCreateFile={createContextProjectFile}
            onCreateFolder={createContextProjectFolder}
            onCreateItem={(itemType, directory, itemName) => {
              if (itemType === "file") {
                return createContextProjectFile(directory, itemName)
              }

              return createContextProjectFolder(directory, itemName)
            }}
            onDeleteNode={deleteContextNode}
            onUploadFiles={uploadContextFiles}
            onPreviewFile={openProjectFile}
          />
        }
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
      loading={layoutLoading}
      loadingLabel={layoutLoadingLabel}
      onCloseAside={() => setContextPanelOpen(false)}
      onCloseSidebar={() => setSidebarOpen(false)}
        sidebar={
          <AppSidebar
            activeProjectPath={activeProjectPath || ""}
            activeSessionId={activeSessionId}
          onCreateProject={createProject}
          onCreateSession={createSession}
          onDeleteProject={deleteProject}
          onClose={() => setSidebarOpen(false)}
          onProjectChange={changeProject}
          onRefreshProjects={refreshProjects}
          onRestartOpenCode={restartOpenCodeServer}
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
