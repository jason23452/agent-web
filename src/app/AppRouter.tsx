import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import { HomeRoute } from "@/features/home/router"
import { WorkspaceProjectRoute } from "@/features/workspace/router/[name]"
import { WorkspaceRoute } from "@/features/workspace/router"
import { ExtensionRoute } from "@/features/extensions/router/[extensionId]"
import type { PinContext } from "@/shared/types/workspace"
import { AppContextPanel } from "@/shared/components/layout/context/AppContextPanel"
import { ExtensionHostActions } from "@/shared/components/layout/context/ExtensionHost"
import { AppFilePreviewDialog } from "@/shared/components/layout/dialogs/AppFilePreviewDialog"
import { AppShell } from "@/shared/components/layout/app/AppShell"
import { AppSidebar } from "@/shared/components/layout/app/AppSidebar"
import { AppTopbar } from "@/shared/components/layout/app/AppTopbar"
import { ChatComposer } from "@/shared/components/layout/context/ChatComposer"
import { getProjectRouteName } from "@/shared/utils/appRouterUtils"
import { useAppNavigation } from "@/shared/hooks/useAppNavigation"
import { useProjectContextFiles } from "@/shared/hooks/useProjectContextFiles"
import { useWorkspaceData } from "@/shared/hooks/useWorkspaceData"
import { useWorkspaceChat } from "@/shared/hooks/useWorkspaceChat"
import {
  buildOpenCodeModelOptions,
  buildThinkingVariantOptions,
  buildTokenUsage,
  getModelSettingsKey,
  getPreferredModelKey,
} from "@/shared/utils/openCodeModelUtils"

const WorkflowsRoute = lazy(() => import("@/features/workflows/router").then((module) => ({ default: module.WorkflowsRoute })))

export function AppRouter() {
  const { changeProject, navigateToExtension, navigateToRoute, navigateToWorkflows, navigateToWorkspaceProject, route } = useAppNavigation()
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [pinContext, setPinContext] = useState<PinContext | null>(null)
  const [disabledOpenCodeModelKeys, setDisabledOpenCodeModelKeys] = useState<string[]>([])
  const [selectedModelKey, setSelectedModelKey] = useState<string | null>(null)
  const [selectedThinkingVariant, setSelectedThinkingVariant] = useState("default")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const workflowProjectName = route.name === "workflows" ? route.projectName : undefined
  const checkedProjectName = route.name === "workspaceProject" || route.name === "workflows" || route.name === "extension" ? route.projectName ?? null : null
  const workspaceData = useWorkspaceData({ checkedProjectName, navigateToRoute })
  const {
    activeAgent, activeOpenCodeContextUsage, activeOpenCodeSessionDetail, activeProjectPath, activeSessionId,
    agentsError, agentsLoading, availableAgents, createProject, createSession: createWorkspaceSession, deleteProject: deleteWorkspaceProject, layoutLoading, layoutLoadingLabel,
    modelRateLimitUsage, openCodeProviderCatalog, openCodeSessions, projectSessions, projects, projectsError, projectsLoading, refreshProjects,
    sessionsError, sessionsLoading, setActiveAgentId, setActiveSessionId, setOpenCodeProviderCatalog, setProjectSessions, setOpenCodeSessions,
  } = workspaceData
  const {
    contextFileTree,
    contextFileTreeError,
    contextFileTreeLoading,
    createContextProjectFile,
    createContextProjectFolder,
    deleteContextNode,
    openProjectFile,
    previewFile,
    reloadContextFileTree,
    setPreviewFile,
    uploadContextFiles,
  } = useProjectContextFiles({ activeProjectPath })

  const activeOpenCodeSession = activeOpenCodeSessionDetail ?? openCodeSessions.find((session) => session.id === activeSessionId)
  const disabledOpenCodeModelKeySet = new Set(disabledOpenCodeModelKeys)
  const modelOptions = buildOpenCodeModelOptions(openCodeProviderCatalog).filter((model) => !disabledOpenCodeModelKeySet.has(getModelSettingsKey(model.providerID, model.id)))
  const selectedModel = modelOptions.find((model) => model.key === selectedModelKey) ?? null
  const {
    attachments: chatAttachments,
    messagesError,
    messagesLoading,
    messageSending,
    removeAttachment,
    sendMessage,
    uploadChatFiles,
    workspaceMessages,
  } = useWorkspaceChat({
    activeAgent,
    activeProjectPath,
    activeSessionId,
    emptyAgentId: "no-primary-agent",
    reloadContextFileTree,
    selectedModel,
    selectedThinkingVariant,
    setActiveSessionId,
    setOpenCodeSessions,
    setProjectSessions,
  })
  const thinkingVariants = buildThinkingVariantOptions(selectedModel)
  const thinkingVariantKeys = thinkingVariants.map((variant) => variant.key).join("\n")
  const selectedThinkingVariantIsAvailable = thinkingVariants.some((variant) => variant.key === selectedThinkingVariant)
  const preferredModelKey = getPreferredModelKey(activeOpenCodeSession, activeAgent, modelOptions, openCodeProviderCatalog)
  const modelOptionKeys = modelOptions.map((model) => model.key).join("\n")
  const selectedModelIsAvailable = Boolean(selectedModelKey && modelOptions.some((model) => model.key === selectedModelKey))

  useEffect(() => {
    if (selectedModelIsAvailable) return
    if (!preferredModelKey) return

    const timeoutId = window.setTimeout(() => setSelectedModelKey(preferredModelKey), 0)

    return () => window.clearTimeout(timeoutId)
  }, [modelOptionKeys, preferredModelKey, selectedModelIsAvailable])

  useEffect(() => {
    if (!thinkingVariantKeys || selectedThinkingVariantIsAvailable) return

    const timeoutId = window.setTimeout(() => setSelectedThinkingVariant("default"), 0)

    return () => window.clearTimeout(timeoutId)
  }, [selectedThinkingVariantIsAvailable, thinkingVariantKeys])

  useEffect(() => {
    if (route.name !== "workflows" || workflowProjectName) return
    navigateToRoute({ name: "workspace" }, { replace: true })
  }, [navigateToRoute, route.name, workflowProjectName])

  const deleteProject = useCallback((project: Parameters<typeof deleteWorkspaceProject>[0]) => {
    return deleteWorkspaceProject(project, getProjectRouteName(project.path), route)
  }, [deleteWorkspaceProject, route])

  const openExtension = useCallback((extensionId: string) => {
    if (checkedProjectName) navigateToExtension(checkedProjectName, extensionId)
  }, [checkedProjectName, navigateToExtension])

  const closeExtension = useCallback(() => {
    if (route.name === "extension") navigateToWorkspaceProject(route.projectName)
  }, [navigateToWorkspaceProject, route])

  const createSessionAndCloseSurfaces = useCallback(async () => {
    const response = await createWorkspaceSession()
    if (!response) return
    navigateToWorkspaceProject(checkedProjectName ?? "")
    setSidebarOpen(false)
    setContextPanelOpen(false)
  }, [checkedProjectName, createWorkspaceSession, navigateToWorkspaceProject])

  function selectSession(sessionId: string) {
    setActiveSessionId(sessionId)
    setSidebarOpen(false)
    setContextPanelOpen(false)
  }

  function pinPreviewContext(context: PinContext) {
    setPinContext(context)
    setPreviewFile(null)
  }

  if (route.name === "workflows" && !route.projectName) {
    return <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground" role="status">正在返回 Workspace...</div>
  }

  if (route.name === "workflows" && route.projectName) {
    return (
      <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground" role="status">正在載入 Workflow Builder...</div>}>
        <WorkflowsRoute
          modelOptions={modelOptions}
          onBack={() => route.projectName ? navigateToWorkspaceProject(route.projectName) : navigateToRoute({ name: "workspace" })}
          project={route.projectName}
        />
      </Suspense>
    )
  }

  if (route.name === "extension") {
    return (
      <ExtensionRoute
        extensionId={route.extensionId}
        initialFilePath={route.filePath}
        onBack={closeExtension}
        project={route.projectName}
        projectLoading={projectsLoading}
        projectPath={activeProjectPath}
      />
    )
  }

  const mainRoute =
    route.name === "workspace" ? (
      <WorkspaceRoute messages={workspaceMessages} loading={messagesLoading} error={messagesError} />
    ) : route.name === "workspaceProject" ? (
      <WorkspaceProjectRoute messages={workspaceMessages} loading={messagesLoading} error={messagesError} />
    ) : (
      <HomeRoute messages={workspaceMessages} loading={messagesLoading} error={messagesError} />
    )

  const topbarTokenUsage = activeOpenCodeContextUsage ?? buildTokenUsage(activeOpenCodeSession, openCodeProviderCatalog)
  const modelCatalogLoading = Boolean(activeProjectPath && sessionsLoading && !openCodeProviderCatalog)
  const activeProjectName = checkedProjectName ?? (activeProjectPath ? getProjectRouteName(activeProjectPath) : undefined)

  return (
    <AppShell
      ariaLabel="AICaht agent workspace"
      aside={
          <AppContextPanel
            fileTree={contextFileTree}
            loading={contextFileTreeLoading}
            message={contextFileTreeError}
            projectActive={Boolean(activeProjectPath)}
            open={contextPanelOpen}
            onClose={() => setContextPanelOpen(false)}
            extensionAction={
              <ExtensionHostActions
                key={activeProjectName ?? "no-project"}
                onOpenExtension={openExtension}
                projectName={activeProjectName}
                projectPath={activeProjectPath}
              />
            }
            onCreateFile={createContextProjectFile}
            onCreateFolder={createContextProjectFolder}
            onCreateItem={(itemType, directory, itemName) => {
              if (itemType === "file") {
                return createContextProjectFile(directory, itemName)
              }

              return createContextProjectFolder(directory, itemName)
            }}
            onDeleteNode={deleteContextNode}
            onOpenExtensionFile={(file) => {
              if (activeProjectName) navigateToExtension(activeProjectName, "xmind", { filePath: file.path ?? file.name })
            }}
            onUploadFiles={uploadContextFiles}
            onPreviewFile={openProjectFile}
          />
        }
      asideOpen={contextPanelOpen}
      composer={
        <ChatComposer
          attachments={chatAttachments}
          onUploadFiles={uploadChatFiles}
          onClearPin={() => setPinContext(null)}
          onRemoveAttachment={removeAttachment}
          onSubmit={sendMessage}
          onThinkingVariantChange={setSelectedThinkingVariant}
          pinContext={pinContext}
          sending={messageSending}
          selectedThinkingVariant={selectedThinkingVariant}
          thinkingVariants={thinkingVariants}
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
           onCreateSession={createSessionAndCloseSurfaces}
          onDeleteProject={deleteProject}
          onClose={() => setSidebarOpen(false)}
           onOpenCodeDisabledModelsChange={setDisabledOpenCodeModelKeys}
           onOpenCodeProviderCatalogChange={setOpenCodeProviderCatalog}
           modelOptions={modelOptions}
           onProjectChange={changeProject}
          onRefreshProjects={refreshProjects}
           onRestartOpenCode={workspaceData.restartOpenCodeServer}
           onWorkflowOpen={() => {
             if (!activeProjectPath) {
               navigateToRoute({ name: "workspace" })
               return
             }
             navigateToWorkflows(getProjectRouteName(activeProjectPath))
           }}
          onSelectSession={selectSession}
          open={sidebarOpen}
          projects={projects}
          projectsError={projectsError}
          projectsLoading={projectsLoading}
          sessions={projectSessions}
           sessionsError={sessionsError}
           sessionsLoading={sessionsLoading}
           workspaceActive={Boolean(activeProjectPath)}
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
          modelLoading={modelCatalogLoading}
          models={modelOptions}
          onAgentChange={setActiveAgentId}
          onModelChange={setSelectedModelKey}
          onOpenContextPanel={() => setContextPanelOpen(true)}
          onOpenSidebar={() => setSidebarOpen(true)}
          rateLimitUsage={modelRateLimitUsage}
          selectedModelKey={selectedModelKey}
          tokenUsage={topbarTokenUsage}
        />
      }
    >
      {mainRoute}
      <AppFilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} onPin={pinPreviewContext} />
    </AppShell>
  )
}
