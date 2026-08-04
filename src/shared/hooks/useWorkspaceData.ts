import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError, getApiErrorMessage } from "@/shared/api"
import { getOpenCodeCurrentUsage, getOpenCodeSessionContextUsage } from "@/shared/api/opencodeUsage"
import { listOpenCodeProviders, type OpenCodeProviderListResponse } from "@/shared/api/opencodeProviders"
import { getProjectSession, listProjectRootSessions, listProjectSessions, toWorkspaceSession, type OpenCodeSession } from "@/features/workspace/api/sessions"
import { listProjectPrimaryAgents } from "@/features/workspace/api/agents"
import { createManagedProject, deleteManagedProject, getManagedProjectStatus, listManagedProjects, toWorkspaceProject } from "@/features/workspace/api/projects"
import { createProjectSession } from "@/features/workspace/api/sessions"
import { restartOpenCodeRuntime } from "@/shared/api/opencodeRuntime"
import { getRestartInProgressOperation, waitForOpenCodeRestartOperation, waitForOpenCodeRuntimeReady } from "@/shared/utils/appRouterUtils"
import type { Agent, ModelRateLimitUsage, Project, Session, TokenUsage } from "@/shared/types/workspace"
import type { AppRoute } from "@/shared/utils/appRouterUtils"

const EMPTY_AGENT: Agent = {
  id: "no-primary-agent",
  name: "無 primary agent",
  provider: "OpenCode",
  status: "idle",
}

function mergeSessionLists<T extends { id: string }>(response: T[], current: T[]) {
  const currentIDs = new Set(current.map((session) => session.id))
  return [...current, ...response.filter((session) => !currentIDs.has(session.id))]
}

type UseWorkspaceDataOptions = {
  checkedProjectName: string | null
  navigateToRoute: (route: AppRoute, options?: { replace?: boolean }) => void
  requestedSessionId?: string
}

export function useWorkspaceData({ checkedProjectName, navigateToRoute, requestedSessionId }: UseWorkspaceDataOptions) {
  const [activeAgentId, setActiveAgentId] = useState("")
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [layoutLoading, setLayoutLoading] = useState(false)
  const [layoutLoadingLabel, setLayoutLoadingLabel] = useState("Loading...")
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [openCodeProviderCatalog, setOpenCodeProviderCatalog] = useState<OpenCodeProviderListResponse | null>(null)
  const [activeOpenCodeSessionDetail, setActiveOpenCodeSessionDetail] = useState<OpenCodeSession | null>(null)
  const [activeOpenCodeContextUsage, setActiveOpenCodeContextUsage] = useState<TokenUsage[] | null>(null)
  const [modelRateLimitUsage, setModelRateLimitUsage] = useState<ModelRateLimitUsage | null>(null)
  const [openCodeSessions, setOpenCodeSessions] = useState<OpenCodeSession[]>([])
  const [projectSessions, setProjectSessions] = useState<Session[]>([])
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const routeSessionRef = useRef({ projectName: checkedProjectName, sessionId: requestedSessionId })

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
    const response = await listOpenCodeProviders({ query: queryDirectory ? { directory: queryDirectory } : undefined, signal })
    if (!signal?.aborted) setOpenCodeProviderCatalog(response)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refreshProjects(), 0)
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
      setActiveSessionId(null)
      setActiveOpenCodeSessionDetail(null)
      setActiveOpenCodeContextUsage(null)
      setOpenCodeSessions([])
      setProjectSessions([])
      setSessionsLoading(true)
      setSessionsError(null)
      setAgentsLoading(true)
      setAgentsError(null)

      void getManagedProjectStatus(checkedProjectName, { signal: controller.signal })
        .then(async (response) => {
          if (controller.signal.aborted) return
          const project = toWorkspaceProject(response.project)
          const directory = response.project.sdkDirectory || response.project.path
          setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)])

          const [sessionsResponse, rootSessionsResponse, agentsResponse, providersResponse] = await Promise.all([
            listProjectSessions(directory, { signal: controller.signal }).catch((error) => {
              if (!controller.signal.aborted) setSessionsError(getApiErrorMessage(error))
              return null
            }),
            listProjectRootSessions(directory, { signal: controller.signal }).catch(() => null),
            listProjectPrimaryAgents(directory, { signal: controller.signal }).catch((error) => {
              if (!controller.signal.aborted) setAgentsError(getApiErrorMessage(error))
              return null
            }),
            listOpenCodeProviders({ query: { directory }, signal: controller.signal }).catch(() => null),
          ])
          if (controller.signal.aborted) return

          if (sessionsResponse || rootSessionsResponse) {
            const nextOpenCodeSessions = sessionsResponse ?? rootSessionsResponse ?? []
            const nextSessions = (rootSessionsResponse ?? nextOpenCodeSessions.filter((session) => !session.parentID)).map(toWorkspaceSession)
            if (rootSessionsResponse) setSessionsError(null)
            setOpenCodeSessions((current) => mergeSessionLists(nextOpenCodeSessions, current))
            setProjectSessions((current) => mergeSessionLists(nextSessions, current))
            setActiveSessionId((current) => current ?? nextSessions[0]?.id ?? null)
          } else {
            setOpenCodeSessions([])
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

  useEffect(() => {
    const previous = routeSessionRef.current
    routeSessionRef.current = { projectName: checkedProjectName, sessionId: requestedSessionId }
    if (!checkedProjectName) return

    const nextSessionID = requestedSessionId
      ?? (previous.projectName === checkedProjectName && previous.sessionId ? projectSessions[0]?.id ?? null : undefined)
    if (nextSessionID === undefined) return
    const timeoutId = window.setTimeout(() => setActiveSessionId(nextSessionID), 0)
    return () => window.clearTimeout(timeoutId)
  }, [checkedProjectName, projectSessions, requestedSessionId])

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
    ]).then(async ([session, contextUsage]) => {
      if (controller.signal.aborted) return
      setActiveOpenCodeSessionDetail(session)
      setActiveOpenCodeContextUsage(contextUsage ? [contextUsage] : null)
      const lineage = [session]
      const visited = new Set([session.id])
      let parentID = session.parentID
      while (parentID && !visited.has(parentID)) {
        visited.add(parentID)
        const parent = await getProjectSession(parentID, activeProjectPath, { signal: controller.signal }).catch(() => null)
        if (!parent || controller.signal.aborted) break
        lineage.push(parent)
        parentID = parent.parentID
      }
      if (!controller.signal.aborted) setOpenCodeSessions((current) => mergeSessionLists(lineage, current))
    }).catch(() => {
      if (!controller.signal.aborted) {
        setActiveOpenCodeSessionDetail(null)
        setActiveOpenCodeContextUsage(null)
      }
    })
    return () => controller.abort()
  }, [activeProjectPath, activeSessionId])

  useEffect(() => {
    const fallbackProviderID = openCodeProviderCatalog?.connected.find((providerID) => providerID !== "opencode")
    const primaryProviderID = activeOpenCodeSessionDetail?.model?.providerID ?? activeAgent.providerID ?? fallbackProviderID
    const providerIDs = Array.from(new Set([primaryProviderID, ...(openCodeProviderCatalog?.connected ?? [])]
      .filter((providerID): providerID is string => Boolean(providerID) && providerID !== "opencode")))

    if (providerIDs.length === 0) {
      const timeoutId = window.setTimeout(() => setModelRateLimitUsage(null), 0)
      return () => window.clearTimeout(timeoutId)
    }

    const controller = new AbortController()
    void Promise.all(providerIDs.map((providerID) => getOpenCodeCurrentUsage(providerID, { signal: controller.signal }).catch(() => null)))
      .then((results) => {
        if (controller.signal.aborted) return
        const usages = results.filter((usage): usage is NonNullable<typeof usage> => Boolean(usage))
        const entries = usages.flatMap((usage) => usage.entries.map((entry) => ({ ...entry, label: usages.length > 1 ? `${usage.providerID} · ${entry.label}` : entry.label })))
        const errors = usages.map((usage) => usage.error).filter(Boolean)
        setModelRateLimitUsage({
          entries,
          error: entries.length === 0 ? errors.join(" · ") || undefined : undefined,
          fetchedAt: usages[0]?.fetchedAt,
          providerID: usages.length > 1 ? "All providers" : usages[0]?.providerID,
        })
      })
      .catch(() => { if (!controller.signal.aborted) setModelRateLimitUsage(null) })
    return () => controller.abort()
  }, [activeAgent.providerID, activeOpenCodeSessionDetail?.model?.providerID, openCodeProviderCatalog?.connected])

  const createProject = useCallback(async (name: string) => {
    const response = await createManagedProject({ displayName: name, name })
    const nextProject = toWorkspaceProject(response.project)
    setProjects((current) => [nextProject, ...current.filter((project) => project.id !== nextProject.id)])
    setProjectsError(null)
    return nextProject
  }, [])

  const deleteProject = useCallback(async (project: Project, deletedRouteName: string, currentRoute: AppRoute) => {
    await deleteManagedProject(project.name)
    setProjects((current) => current.filter((item) => item.id !== project.id))
    setProjectsError(null)
    if ("projectName" in currentRoute && (currentRoute.projectName === project.name || currentRoute.projectName === deletedRouteName)) {
      navigateToRoute({ name: "workspace" }, { replace: true })
    }
  }, [navigateToRoute])

  const createSession = useCallback(async () => {
    if (!checkedProjectName || !activeProjectPath) {
      setSessionsError("請先選擇專案後再建立對話。")
      navigateToRoute({ name: "workspace" }, { replace: true })
      return null
    }
    setSessionsError(null)
    const response = await createProjectSession(activeProjectPath, { title: "新對話" })
    const nextSession = toWorkspaceSession(response)
    setOpenCodeSessions((current) => [response, ...current.filter((session) => session.id !== response.id)])
    setProjectSessions((current) => [nextSession, ...current.filter((session) => session.id !== nextSession.id)])
    setActiveSessionId(response.id)
    return response
  }, [activeProjectPath, checkedProjectName, navigateToRoute])

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
        if (runningOperation.operationID) await waitForOpenCodeRestartOperation(runningOperation.operationID)
        else await waitForOpenCodeRuntimeReady()
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

  return {
    activeAgent, activeAgentId, activeOpenCodeContextUsage, activeOpenCodeSessionDetail, activeProjectPath, activeSessionId,
    agentsError, agentsLoading, availableAgents, createProject, createSession, deleteProject, layoutLoading, layoutLoadingLabel,
    modelRateLimitUsage, openCodeProviderCatalog, openCodeSessions, projectSessions, projects, projectsError, projectsLoading,
    refreshOpenCodeProviderCatalog, refreshProjects, restartOpenCodeServer, sessionsError, sessionsLoading,
    setActiveAgentId, setActiveOpenCodeContextUsage, setActiveOpenCodeSessionDetail, setActiveSessionId, setAgentsError,
    setAgentsLoading, setAvailableAgents, setLayoutLoading, setLayoutLoadingLabel, setModelRateLimitUsage, setOpenCodeProviderCatalog,
    setOpenCodeSessions, setProjectSessions, setProjects, setProjectsError, setProjectsLoading, setSessionsError, setSessionsLoading,
  }
}
