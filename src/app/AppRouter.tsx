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
import { ChatComposer, SubagentComposerNotice } from "@/shared/components/layout/context/ChatComposer"
import { listOpenCodeCommands, type OpenCodeRuntimeCommand } from "@/shared/api/opencodeCommands"
import { getProjectRouteName, getRoutePath } from "@/shared/utils/appRouterUtils"
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

function getSubagentSessionTitle(title: string) {
  return title.replace(/\s+\(@[^)]+ subagent\)\s*$/i, "").trim() || title
}

export function AppRouter() {
  const { changeProject, navigateToExtension, navigateToRoute, navigateToWorkflows, navigateToWorkspaceProject, navigateToWorkspaceSession, route } = useAppNavigation()
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [pinContext, setPinContext] = useState<PinContext | null>(null)
  const [disabledOpenCodeModelKeys, setDisabledOpenCodeModelKeys] = useState<string[]>([])
  const [openCodeCommandState, setOpenCodeCommandState] = useState<{ commands: OpenCodeRuntimeCommand[]; directory: string } | null>(null)
  const [selectedModelKey, setSelectedModelKey] = useState<string | null>(null)
  const [selectedThinkingVariant, setSelectedThinkingVariant] = useState("default")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [composerRevision, setComposerRevision] = useState(0)

  const workflowProjectName = route.name === "workflows" ? route.projectName : undefined
  const checkedProjectName = route.name === "workspaceProject" || route.name === "workflows" || route.name === "extension" ? route.projectName ?? null : null
  const requestedSessionId = route.name === "workspaceProject" ? route.sessionId : undefined
  const workspaceData = useWorkspaceData({ checkedProjectName, navigateToRoute, requestedSessionId })
  const {
    activeAgent, activeOpenCodeContextUsage, activeOpenCodeSessionDetail, activeProjectPath, activeSessionId, archiveSession,
    agentsError, agentsLoading, availableAgents, createProject, deleteProject: deleteWorkspaceProject, layoutLoading, layoutLoadingLabel,
    deleteSession, modelRateLimitUsage, openCodeProviderCatalog, openCodeSessions, projectSessions, projects, projectsError, projectsLoading, refreshProjects,
    sessionsError, sessionsLoading, setActiveAgentId, setActiveSessionId, setOpenCodeProviderCatalog, setProjectSessions, setOpenCodeSessions, startNewConversation,
  } = workspaceData
  const {
    contextFileTree,
    contextFileTreeError,
    contextFileTreeLoading,
    contextFileTreeUploading,
    contextFileTreeUploadProgress,
    createContextProjectFile,
    createContextProjectFolder,
    deleteContextNode,
    downloadContextNode,
    openProjectFile,
    previewFile,
    reloadContextFileTree,
    setPreviewFile,
    uploadContextFiles,
  } = useProjectContextFiles({ activeProjectPath })

  const activeOpenCodeSession = activeOpenCodeSessionDetail?.id === activeSessionId
    ? activeOpenCodeSessionDetail
    : openCodeSessions.find((session) => session.id === activeSessionId)
  const activeParentSessionID = activeOpenCodeSession?.parentID
  const activeParentSession = activeParentSessionID ? openCodeSessions.find((session) => session.id === activeParentSessionID) : undefined
  const syncCreatedSessionRoute = useCallback((sessionID: string) => {
    if (checkedProjectName) navigateToWorkspaceSession(checkedProjectName, sessionID, { replace: true })
  }, [checkedProjectName, navigateToWorkspaceSession])
  const disabledOpenCodeModelKeySet = new Set(disabledOpenCodeModelKeys)
  const modelOptions = buildOpenCodeModelOptions(openCodeProviderCatalog).filter((model) => !disabledOpenCodeModelKeySet.has(getModelSettingsKey(model.providerID, model.id)))
  const selectedModel = modelOptions.find((model) => model.key === selectedModelKey) ?? null
  const openCodeCommands = openCodeCommandState?.directory === activeProjectPath ? openCodeCommandState.commands : []
  const {
    attachments: chatAttachments,
    cancelMessage,
    messagesError,
    messagesLoading,
    messageSending,
    removeAttachment,
    resetConversation,
    sendMessage,
    uploadChatFiles,
    workspaceMessages,
  } = useWorkspaceChat({
    activeAgent,
    activeProjectPath,
    activeSessionId,
    commands: openCodeCommands,
    emptyAgentId: "no-primary-agent",
    onSessionCreated: syncCreatedSessionRoute,
    reloadContextFileTree,
    selectedModel,
    selectedThinkingVariant,
    setActiveSessionId,
    setOpenCodeSessions,
    setProjectSessions,
  })
  useEffect(() => {
    const controller = new AbortController()
    if (!activeProjectPath) return () => controller.abort()

    void listOpenCodeCommands(activeProjectPath, { signal: controller.signal })
      .then((commands) => {
        if (!controller.signal.aborted) setOpenCodeCommandState({ commands, directory: activeProjectPath })
      })
      .catch(() => {
        if (!controller.signal.aborted) setOpenCodeCommandState({ commands: [], directory: activeProjectPath })
      })

    return () => controller.abort()
  }, [activeProjectPath])

  const commandCompletionOptions = openCodeCommands.map(({ description, name }) => ({ description, name }))
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

  const startNewConversationAndCloseSurfaces = useCallback(() => {
    if (!startNewConversation()) return
    resetConversation()
    setPinContext(null)
    setComposerRevision((current) => current + 1)
    if (checkedProjectName) navigateToWorkspaceProject(checkedProjectName)
    setSidebarOpen(false)
    setContextPanelOpen(false)
  }, [checkedProjectName, navigateToWorkspaceProject, resetConversation, startNewConversation])

  function selectSession(sessionId: string) {
    setActiveSessionId(sessionId)
    if (checkedProjectName) navigateToWorkspaceSession(checkedProjectName, sessionId)
    setSidebarOpen(false)
    setContextPanelOpen(false)
  }

  function openSubagentSession(sessionId: string) {
    if (checkedProjectName && route.name === "workspaceProject" && !route.sessionId && activeSessionId) {
      navigateToWorkspaceSession(checkedProjectName, activeSessionId, { replace: true })
    }
    selectSession(sessionId)
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
      <WorkspaceProjectRoute
        error={messagesError}
        getSessionHref={(sessionId) => getRoutePath({ name: "workspaceProject", projectName: route.projectName, sessionId })}
        loading={messagesLoading}
        messages={workspaceMessages}
        onSelectSession={openSubagentSession}
        sessionBreadcrumb={activeParentSessionID ? {
          childTitle: getSubagentSessionTitle(activeOpenCodeSession?.title ?? "Subagent session"),
          onParentSelect: () => selectSession(activeParentSessionID),
          parentTitle: activeParentSession?.title ?? "Parent session",
        } : undefined}
      />
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
            uploading={contextFileTreeUploading}
            uploadProgress={contextFileTreeUploadProgress}
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
            onDownloadNode={downloadContextNode}
            onOpenExtensionFile={(file) => {
              if (activeProjectName) navigateToExtension(activeProjectName, "xmind", { filePath: file.path ?? file.name })
            }}
            onUploadFiles={uploadContextFiles}
            onPreviewFile={openProjectFile}
          />
        }
      asideOpen={contextPanelOpen}
      composer={
        activeParentSessionID ? (
          <SubagentComposerNotice onBack={() => selectSession(activeParentSessionID)} parentTitle={activeParentSession?.title ?? "Parent session"} />
        ) : (
          <ChatComposer
            key={`${activeSessionId ?? "draft"}-${composerRevision}`}
            attachments={chatAttachments}
            commands={commandCompletionOptions}
            disabled={Boolean(activeSessionId && !activeOpenCodeSession)}
            onCancel={cancelMessage}
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
        )
      }
      loading={layoutLoading}
      loadingLabel={layoutLoadingLabel}
      onCloseAside={() => setContextPanelOpen(false)}
      onCloseSidebar={() => setSidebarOpen(false)}
        sidebar={
          <AppSidebar
            activeProjectPath={activeProjectPath || ""}
             activeSessionId={activeSessionId}
           onArchiveSession={archiveSession}
          onCreateProject={createProject}
           onCreateSession={startNewConversationAndCloseSurfaces}
          onDeleteProject={deleteProject}
          onDeleteSession={deleteSession}
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
      <AppFilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} onPin={pinPreviewContext} workspace={activeProjectName} />
    </AppShell>
  )
}
