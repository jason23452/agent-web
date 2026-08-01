import { useCallback, useEffect, useState } from "react"
import { HomeRoute } from "@/features/home/router"
import { createOrUpdateProjectFile, createProjectDirectory, deleteProjectFile, readProjectFileContent } from "@/features/workspace/api/files"
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
import type { Agent, Attachment, FileNode, ModelOption, ModelRateLimitUsage, PinContext, Project, Session, ThinkingVariantOption, TokenUsage, WorkspaceMessage } from "@/shared/types/workspace"
import { AppContextPanel } from "@/shared/components/layout/context/AppContextPanel"
import { AppFilePreviewDialog } from "@/shared/components/layout/dialogs/AppFilePreviewDialog"
import type { FileTreeNode } from "@/shared/components/layout/context/FileTree"
import { AppShell } from "@/shared/components/layout/app/AppShell"
import { AppSidebar } from "@/shared/components/layout/app/AppSidebar"
import { AppTopbar } from "@/shared/components/layout/app/AppTopbar"
import { ChatComposer } from "@/shared/components/layout/context/ChatComposer"
import {
  buildWorkspaceFileTree,
  combineRelativePath,
  decodeTextContent,
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
const DEFAULT_THINKING_VARIANTS: ThinkingVariantOption[] = [
  { key: "default", label: "Default" },
  { key: "none", label: "None" },
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "xhigh", label: "Xhigh" },
]

function buildTokenUsage(session: OpenCodeSession | undefined, providers: OpenCodeProviderListResponse | null): TokenUsage[] {
  if (!session?.model) {
    return [{ label: "Context", used: 0, limit: 0 }]
  }

  const provider = providers?.all.find((item) => item.id === session.model?.providerID)
  const model = provider?.models[session.model.id]
  const tokens = session.tokens
  const input = tokens?.input ?? 0
  const output = tokens?.output ?? 0
  const reasoning = tokens?.reasoning ?? 0
  const cacheRead = tokens?.cache.read ?? 0
  const cacheWrite = tokens?.cache.write ?? 0
  const used = input + output + reasoning + cacheRead + cacheWrite
  const limit = model?.limit?.context ?? 0
  const modelLabel = `${provider?.name ?? session.model.providerID} / ${model?.name ?? session.model.id}`

  return [
    {
      cacheRead,
      cacheWrite,
      input,
      label: "Context",
      limit,
      modelLabel,
      output,
      providerLabel: provider?.name ?? session.model.providerID,
      reasoning,
      used,
    },
  ]
}

function getModelKey(providerID: string, modelID: string, variant?: string) {
  return variant ? `${providerID}:${modelID}:${variant}` : `${providerID}:${modelID}`
}

function getModelSettingsKey(providerID: string, modelID: string) {
  return `${providerID}/${modelID}`
}

function getModelVariants(variants: unknown) {
  if (Array.isArray(variants)) {
    return variants
      .map((variant) => {
        if (typeof variant === "string") return variant
        if (variant && typeof variant === "object" && "id" in variant && typeof variant.id === "string") return variant.id
        return null
      })
      .filter((variant): variant is string => Boolean(variant))
  }

  if (variants && typeof variants === "object") {
    return Object.keys(variants)
  }

  return []
}

function formatAttachmentSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getEventPayload(event: OpenCodeEvent) {
  return event.payload ?? event
}

function buildOpenCodeModelOptions(providers: OpenCodeProviderListResponse | null): ModelOption[] {
  if (!providers) return []

  const connectedProviderIDs = new Set(providers.connected)

  return providers.all
    .filter((provider) => connectedProviderIDs.has(provider.id))
    .flatMap((provider) => Object.values(provider.models).map((model) => ({
      contextLimit: model.limit?.context,
      id: model.id,
      key: getModelKey(provider.id, model.id, model.variant),
      name: model.name,
      providerID: provider.id,
      providerName: provider.name,
      reasoning: model.capabilities?.reasoning,
      status: model.status,
      variant: model.request?.variant ?? model.variant,
      variants: getModelVariants(model.variants),
    })))
}

function formatThinkingVariantLabel(variant: string) {
  if (variant === "xhigh") return "Xhigh"
  return variant.charAt(0).toUpperCase() + variant.slice(1)
}

function buildThinkingVariantOptions(model: ModelOption | null): ThinkingVariantOption[] {
  if (!model?.reasoning) return []

  const apiVariants = model.variants?.filter(Boolean) ?? []
  if (apiVariants.length === 0) return DEFAULT_THINKING_VARIANTS

  return [
    { key: "default", label: "Default" },
    ...apiVariants.map((variant) => ({ key: variant, label: formatThinkingVariantLabel(variant) })),
  ]
}

function getOpenCodeDefaultModelKey(providers: OpenCodeProviderListResponse | null) {
  if (!providers) return null

  for (const [providerID, modelID] of Object.entries(providers.default)) {
    if (providers.connected.includes(providerID)) return getModelKey(providerID, modelID)
  }

  return null
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
  const [contextFileTree, setContextFileTree] = useState<FileTreeNode[]>([])
  const [contextFileTreeLoading, setContextFileTreeLoading] = useState(false)
  const [contextFileTreeError, setContextFileTreeError] = useState<string | null>(null)
  const [contextFileTreeVersion, setContextFileTreeVersion] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [workspaceMessages, setWorkspaceMessages] = useState<WorkspaceMessage[]>([])
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageSending, setMessageSending] = useState(false)

  const triggerContextFileTreeReload = useCallback(() => {
    setContextFileTreeVersion((current) => current + 1)
  }, [])

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
  const activeSessionVariantModelKey = activeOpenCodeSession?.model
    ? getModelKey(activeOpenCodeSession.model.providerID, activeOpenCodeSession.model.id, activeOpenCodeSession.model.variant)
    : null
  const activeSessionModelKey = activeOpenCodeSession?.model
    ? getModelKey(activeOpenCodeSession.model.providerID, activeOpenCodeSession.model.id)
    : null
  const preferredModelKey = activeSessionVariantModelKey && modelOptions.some((model) => model.key === activeSessionVariantModelKey)
    ? activeSessionVariantModelKey
    : activeSessionModelKey && modelOptions.some((model) => model.key === activeSessionModelKey)
      ? activeSessionModelKey
      : activeAgent.providerID && activeAgent.modelID
      ? getModelKey(activeAgent.providerID, activeAgent.modelID)
      : getOpenCodeDefaultModelKey(openCodeProviderCatalog) ?? modelOptions[0]?.key ?? null
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
        triggerContextFileTreeReload()
      }
    }, controller.signal).catch((error) => {
      if (!controller.signal.aborted) console.warn(getApiErrorMessage(error))
    })

    return () => controller.abort()
  }, [activeProjectPath, activeSessionId, loadWorkspaceMessages, triggerContextFileTreeReload])

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

      setContextFileTree([])
      setContextFileTreeError(error instanceof Error ? error.message : "讀取專案檔案樹失敗。")
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
    triggerContextFileTreeReload()
  }, [activeProjectPath, triggerContextFileTreeReload])

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

  function changeProject(projectPath: string) {
    navigateToWorkspaceProject(getProjectRouteName(projectPath))
  }

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

  const renderedContextFileTree = activeProjectPath ? contextFileTree : []
  const renderedContextFileTreeLoading = activeProjectPath ? contextFileTreeLoading : false
  const renderedContextFileTreeError = activeProjectPath
    ? contextFileTreeError
    : NO_ACTIVE_PROJECT_FILE_TREE_MESSAGE
  const topbarTokenUsage = activeOpenCodeContextUsage ?? buildTokenUsage(activeOpenCodeSession, openCodeProviderCatalog)
  const modelCatalogLoading = Boolean(activeProjectPath && sessionsLoading && !openCodeProviderCatalog)

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
