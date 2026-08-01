import { useCallback, useEffect, useState } from "react"
import { HomeRoute } from "@/features/home/router"
import { createOrUpdateProjectFile } from "@/features/workspace/api/files"
import { listProjectPrimaryAgents } from "@/features/workspace/api/agents"
import { createManagedProject, deleteManagedProject, getManagedProjectStatus, listManagedProjects, toWorkspaceProject } from "@/features/workspace/api/projects"
import { createProjectSession, getProjectSession, listProjectSessions, toWorkspaceSession, type OpenCodeSession } from "@/features/workspace/api/sessions"
import { listSessionMessages, sendSessionPrompt, toWorkspaceMessages } from "@/features/workspace/api/messages"
import { WorkspaceProjectRoute } from "@/features/workspace/router/[name]"
import { WorkspaceRoute } from "@/features/workspace/router"
import { ApiError, getApiErrorMessage } from "@/shared/api"
import { consumeOpenCodeEvents, type OpenCodeEvent } from "@/shared/api/opencodeEvents"
import { restartOpenCodeRuntime } from "@/shared/api/opencodeRuntime"
import { listOpenCodeProviders, type OpenCodeProviderListResponse } from "@/shared/api/opencodeProviders"
import { getOpenCodeCurrentUsage, getOpenCodeSessionContextUsage } from "@/shared/api/opencodeUsage"
import type { Agent, Attachment, ModelRateLimitUsage, PinContext, Project, Session, TokenUsage, WorkspaceMessage } from "@/shared/types/workspace"
import { AppContextPanel } from "@/shared/components/layout/context/AppContextPanel"
import { AppFilePreviewDialog } from "@/shared/components/layout/dialogs/AppFilePreviewDialog"
import { AppShell } from "@/shared/components/layout/app/AppShell"
import { AppSidebar } from "@/shared/components/layout/app/AppSidebar"
import { AppTopbar } from "@/shared/components/layout/app/AppTopbar"
import { ChatComposer } from "@/shared/components/layout/context/ChatComposer"
import {
  getProjectRouteName,
  getRestartInProgressOperation,
  readFileAsBase64,
  waitForOpenCodeRestartOperation,
  waitForOpenCodeRuntimeReady,
} from "@/shared/utils/appRouterUtils"
import { useAppNavigation } from "@/shared/hooks/useAppNavigation"
import { useProjectContextFiles } from "@/shared/hooks/useProjectContextFiles"
import {
  buildOpenCodeModelOptions,
  buildThinkingVariantOptions,
  buildTokenUsage,
  getModelSettingsKey,
  getPreferredModelKey,
} from "@/shared/utils/openCodeModelUtils"

const EMPTY_AGENT: Agent = {
  id: "no-primary-agent",
  name: "無 primary agent",
  provider: "OpenCode",
  status: "idle",
}

function formatAttachmentSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getEventPayload(event: OpenCodeEvent) {
  return event.payload ?? event
}

export function AppRouter() {
  const { changeProject, navigateToRoute, navigateToWorkspaceProject, route } = useAppNavigation()
  const [activeAgentId, setActiveAgentId] = useState("")
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [pinContext, setPinContext] = useState<PinContext | null>(null)
  const [layoutLoading, setLayoutLoading] = useState(false)
  const [layoutLoadingLabel, setLayoutLoadingLabel] = useState("Loading...")
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [openCodeProviderCatalog, setOpenCodeProviderCatalog] = useState<OpenCodeProviderListResponse | null>(null)
  const [disabledOpenCodeModelKeys, setDisabledOpenCodeModelKeys] = useState<string[]>([])
  const [selectedModelKey, setSelectedModelKey] = useState<string | null>(null)
  const [selectedThinkingVariant, setSelectedThinkingVariant] = useState("default")
  const [activeOpenCodeSessionDetail, setActiveOpenCodeSessionDetail] = useState<OpenCodeSession | null>(null)
  const [activeOpenCodeContextUsage, setActiveOpenCodeContextUsage] = useState<TokenUsage[] | null>(null)
  const [modelRateLimitUsage, setModelRateLimitUsage] = useState<ModelRateLimitUsage | null>(null)
  const [openCodeSessions, setOpenCodeSessions] = useState<OpenCodeSession[]>([])
  const [projectSessions, setProjectSessions] = useState<Session[]>([])
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [workspaceMessages, setWorkspaceMessages] = useState<WorkspaceMessage[]>([])
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageSending, setMessageSending] = useState(false)

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

  const refreshOpenCodeProviderCatalog = useCallback(async (directory?: string | null, signal?: AbortSignal) => {
    const queryDirectory = directory?.trim() || undefined
    const providersResponse = await listOpenCodeProviders({
      query: queryDirectory ? { directory: queryDirectory } : undefined,
      signal,
    })

    if (!signal?.aborted) setOpenCodeProviderCatalog(providersResponse)
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

          const [sessionsResponse, agentsResponse, providersResponse] = await Promise.all([
            listProjectSessions(directory, { signal: controller.signal }).catch((error) => {
              if (!controller.signal.aborted) setSessionsError(getApiErrorMessage(error))
              return null
            }),
            listProjectPrimaryAgents(directory, { signal: controller.signal }).catch((error) => {
              if (!controller.signal.aborted) setAgentsError(getApiErrorMessage(error))
              return null
            }),
            listOpenCodeProviders({ query: { directory }, signal: controller.signal }).catch(() => null),
          ])
          if (controller.signal.aborted) return

          if (sessionsResponse) {
            setOpenCodeSessions(sessionsResponse)
            setActiveOpenCodeSessionDetail(null)
            const nextSessions = sessionsResponse.map(toWorkspaceSession)
            setProjectSessions(nextSessions)
            setActiveSessionId((current) => current && nextSessions.some((session) => session.id === current) ? current : nextSessions[0]?.id ?? null)
          } else {
            setOpenCodeSessions([])
            setActiveOpenCodeSessionDetail(null)
            setProjectSessions([])
            setActiveSessionId(null)
          }

          setOpenCodeProviderCatalog(providersResponse)

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
          setOpenCodeSessions([])
          setActiveOpenCodeSessionDetail(null)
          setOpenCodeProviderCatalog(null)
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

  const activeProjectPath = checkedProjectName
    ? projects.find((project) => project.id === checkedProjectName || project.name === checkedProjectName)?.path ?? null
    : null
  const activeAgent = availableAgents.find((agent) => agent.id === activeAgentId) ?? availableAgents[0] ?? EMPTY_AGENT
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
    setContextFileTreeError,
    setPreviewFile,
    uploadContextFiles,
  } = useProjectContextFiles({ activeProjectPath })

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      void refreshOpenCodeProviderCatalog(activeProjectPath, controller.signal).catch(() => {
        if (!controller.signal.aborted) setOpenCodeProviderCatalog(null)
      })
    }, 0)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [activeProjectPath, refreshOpenCodeProviderCatalog])

  const activeOpenCodeSession = activeOpenCodeSessionDetail ?? openCodeSessions.find((session) => session.id === activeSessionId)
  const disabledOpenCodeModelKeySet = new Set(disabledOpenCodeModelKeys)
  const modelOptions = buildOpenCodeModelOptions(openCodeProviderCatalog).filter((model) => !disabledOpenCodeModelKeySet.has(getModelSettingsKey(model.providerID, model.id)))
  const selectedModel = modelOptions.find((model) => model.key === selectedModelKey) ?? null
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
    if (!activeProjectPath || !activeSessionId) {
      const timeoutId = window.setTimeout(() => {
        setActiveOpenCodeSessionDetail(null)
        setActiveOpenCodeContextUsage(null)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    const controller = new AbortController()
    void Promise.all([
      getProjectSession(activeSessionId, activeProjectPath, { signal: controller.signal }),
      getOpenCodeSessionContextUsage(activeSessionId, activeProjectPath, { signal: controller.signal }).catch(() => null),
    ])
      .then(([session, contextUsage]) => {
        if (controller.signal.aborted) return

        setActiveOpenCodeSessionDetail(session)
        setActiveOpenCodeContextUsage(contextUsage ? [contextUsage] : null)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setActiveOpenCodeSessionDetail(null)
          setActiveOpenCodeContextUsage(null)
        }
      })

    return () => controller.abort()
  }, [activeProjectPath, activeSessionId])

  const loadWorkspaceMessages = useCallback(async (sessionID: string, directory: string, signal?: AbortSignal, options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading !== false
    if (showLoading) setMessagesLoading(true)
    setMessagesError(null)

    try {
      const response = await listSessionMessages(sessionID, directory, { signal })
      if (signal?.aborted) return response

      const nextMessages = toWorkspaceMessages(response)
      setWorkspaceMessages(nextMessages)
      return response
    } catch (error) {
      if (!signal?.aborted) {
        setWorkspaceMessages([])
        setMessagesError(getApiErrorMessage(error))
      }
      return null
    } finally {
      if (showLoading && !signal?.aborted) setMessagesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!activeProjectPath || !activeSessionId) {
      const timeoutId = window.setTimeout(() => {
        setWorkspaceMessages([])
        setMessagesError(null)
        setMessagesLoading(false)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      void loadWorkspaceMessages(activeSessionId, activeProjectPath, controller.signal)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [activeProjectPath, activeSessionId, loadWorkspaceMessages])

  useEffect(() => {
    if (!activeProjectPath) return

    const controller = new AbortController()
    void consumeOpenCodeEvents(activeProjectPath, (event) => {
      const payload = getEventPayload(event)
      const properties = payload.properties ?? {}
      const sessionID = typeof properties.sessionID === "string" ? properties.sessionID : undefined

      if (payload.type === "session.status" && sessionID === activeSessionId) {
        const status = properties.status
        if (status && typeof status === "object" && "type" in status && status.type === "idle") {
          setMessageSending(false)
          void loadWorkspaceMessages(activeSessionId, activeProjectPath, undefined, { showLoading: false })
        }
      }

      if ((payload.type === "message.updated" || payload.type === "message.part.updated" || payload.type === "session.idle") && sessionID === activeSessionId) {
        void loadWorkspaceMessages(activeSessionId, activeProjectPath, undefined, { showLoading: false })
      }

      if (payload.type === "file.edited") {
        reloadContextFileTree()
      }
    }, controller.signal).catch((error) => {
      if (!controller.signal.aborted) console.warn(getApiErrorMessage(error))
    })

    return () => controller.abort()
  }, [activeProjectPath, activeSessionId, loadWorkspaceMessages, reloadContextFileTree])

  useEffect(() => {
    const fallbackProviderID = openCodeProviderCatalog?.connected.find((providerID) => providerID !== "opencode")
    const primaryProviderID = selectedModel?.providerID ?? activeOpenCodeSessionDetail?.model?.providerID ?? activeAgent.providerID ?? fallbackProviderID
    const providerIDs = Array.from(new Set([
      primaryProviderID,
      ...(openCodeProviderCatalog?.connected ?? []),
    ].filter((providerID): providerID is string => Boolean(providerID) && providerID !== "opencode")))

    if (providerIDs.length === 0) {
      const timeoutId = window.setTimeout(() => setModelRateLimitUsage(null), 0)

      return () => window.clearTimeout(timeoutId)
    }

    const controller = new AbortController()
    void Promise.all(providerIDs.map((providerID) => getOpenCodeCurrentUsage(providerID, { signal: controller.signal }).catch(() => null)))
      .then((results) => {
        if (controller.signal.aborted) return

        const usages = results.filter((usage): usage is NonNullable<typeof usage> => Boolean(usage))
        const entries = usages.flatMap((usage) => usage.entries.map((entry) => ({
          ...entry,
          label: usages.length > 1 ? `${usage.providerID} · ${entry.label}` : entry.label,
        })))
        const errors = usages.map((usage) => usage.error).filter(Boolean)

        setModelRateLimitUsage({
          entries,
          error: entries.length === 0 ? errors.join(" · ") || undefined : undefined,
          fetchedAt: usages[0]?.fetchedAt,
          providerID: usages.length > 1 ? "All providers" : usages[0]?.providerID,
        })
      })
      .catch(() => {
        if (!controller.signal.aborted) setModelRateLimitUsage(null)
      })

    return () => controller.abort()
  }, [activeAgent.providerID, activeOpenCodeSessionDetail?.model?.providerID, openCodeProviderCatalog?.connected, selectedModel?.providerID])

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

  const createSession = useCallback(async () => {
    if (!checkedProjectName || !activeProjectPath) {
      setSessionsError("請先選擇專案後再建立對話。")
      navigateToRoute({ name: "workspace" }, { replace: true })
      return
    }

    setSessionsError(null)

    const response = await createProjectSession(activeProjectPath, { title: "新對話" })
    const nextSession = toWorkspaceSession(response)
    setOpenCodeSessions((current) => [response, ...current.filter((session) => session.id !== response.id)])
    setProjectSessions((current) => [nextSession, ...current.filter((session) => session.id !== nextSession.id)])
    setActiveSessionId(response.id)
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

  const uploadChatFiles = useCallback(async (files: readonly File[]) => {
    if (!activeProjectPath) throw new Error("請先開啟專案後再上傳檔案。")

    const uploaded = await Promise.all(Array.from(files).map(async (file) => {
      const encoded = await readFileAsBase64(file)
      await createOrUpdateProjectFile({
        content: encoded,
        directory: activeProjectPath,
        encoding: "base64",
        overwrite: true,
        path: file.name,
      })

      return {
        id: file.name,
        isImage: file.type.startsWith("image/"),
        meta: formatAttachmentSize(file.size),
        name: file.name,
        path: file.name,
      } satisfies Attachment
    }))

    setAttachments((current) => [
      ...current.filter((attachment) => !uploaded.some((item) => item.id === attachment.id)),
      ...uploaded,
    ])
    setContextFileTreeError(null)
    reloadContextFileTree()
  }, [activeProjectPath, reloadContextFileTree, setContextFileTreeError])

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

  const sendMessage = useCallback(async (text: string, selectedAttachments: Attachment[], context: PinContext | null): Promise<boolean> => {
    if (!activeProjectPath) {
      setMessagesError("請先開啟專案後再傳送訊息。")
      return false
    }

    const promptText = [
      text.trim(),
      context ? `\n\nContext: ${context.label}\n${context.text}` : "",
      selectedAttachments.length > 0
        ? `\n\nReferenced project files:\n${selectedAttachments.map((attachment) => `- ${attachment.path ?? attachment.name}`).join("\n")}`
        : "",
    ].filter(Boolean).join("")
    if (!promptText.trim()) return false

    try {
      let sessionID = activeSessionId
      if (!sessionID) {
        const response = await createProjectSession(activeProjectPath, { title: text.trim().slice(0, 80) || "新對話" })
        const nextSession = toWorkspaceSession(response)
        sessionID = response.id
        setOpenCodeSessions((current) => [response, ...current])
        setProjectSessions((current) => [nextSession, ...current])
        setActiveSessionId(sessionID)
      }

      setMessageSending(true)
      setMessagesError(null)
      await sendSessionPrompt(sessionID, activeProjectPath, {
        agent: activeAgent.id === EMPTY_AGENT.id ? undefined : activeAgent.id,
        model: selectedModel ? {
          modelID: selectedModel.id,
          providerID: selectedModel.providerID,
          ...(selectedThinkingVariant !== "default" ? { variant: selectedThinkingVariant } : {}),
        } : undefined,
        text: promptText,
      })
      setAttachments([])
      setPinContext(null)

      let attempts = 0
      const refreshUntilComplete = async () => {
        attempts += 1
        const response = await listSessionMessages(sessionID!, activeProjectPath).catch(() => null)
        if (response) {
          setWorkspaceMessages(toWorkspaceMessages(response))
          const lastAssistant = [...response].reverse().find((message) => message.info.role === "assistant")
          if (lastAssistant?.info.time?.completed || lastAssistant?.info.error || attempts >= 120) {
            setMessageSending(false)
            return
          }
        }

        if (attempts < 120) window.setTimeout(() => void refreshUntilComplete(), 1_000)
        else setMessageSending(false)
      }
      window.setTimeout(() => void refreshUntilComplete(), 500)
      return true
    } catch (error) {
      setMessageSending(false)
      setMessagesError(getApiErrorMessage(error))
      return false
    }
  }, [activeAgent.id, activeProjectPath, activeSessionId, selectedModel, selectedThinkingVariant])

  function pinPreviewContext(context: PinContext) {
    setPinContext(context)
    setPreviewFile(null)
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
          onCreateSession={createSession}
          onDeleteProject={deleteProject}
          onClose={() => setSidebarOpen(false)}
          onOpenCodeDisabledModelsChange={setDisabledOpenCodeModelKeys}
          onOpenCodeProviderCatalogChange={setOpenCodeProviderCatalog}
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
