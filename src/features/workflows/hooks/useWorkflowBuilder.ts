import { useCallback, useEffect, useState } from "react"
import { getApiErrorMessage } from "@/shared/api"
import { toastManager } from "@/shared/components/ui/toast"
import {
  clearNodeCache,
  createWorkflow,
  deleteWorkflow,
  exportWorkflow,
  getWorkflow,
  getNodeCache,
  getWorkflowResources,
  getWorkflowRun,
  listWorkflows,
  publishWorkflow,
  runWorkflow,
  updateWorkflow,
  validateWorkflow,
} from "@/features/workflows/api/workflows"
import { createProjectWorkflowArchive, readProjectWorkflowArchive } from "@/features/workflows/workflowArchive"
import type {
  WorkflowPublishReport,
  WorkflowCacheMetadataResult,
  WorkflowCreateInput,
  WorkflowResourceCatalog,
  WorkflowRun,
  WorkflowSummary,
  WorkflowTarget,
  WorkflowV1,
} from "@/features/workflows/types"
import { createWorkflowDraft, ensureWorkflowCapabilityConnections, issueMessage, normalizeWorkflowSchemaVersion, syncWorkflowAgentConfigs, touchWorkflow } from "@/features/workflows/workflowUtils"
import { downloadBytes } from "@/shared/utils/projectFileDownload"

export function useWorkflowBuilder(project?: string) {
  const [workflow, setWorkflow] = useState<WorkflowV1>(() => createWorkflowDraft(project))
  const [persisted, setPersisted] = useState(false)
  const [dirty, setDirty] = useState(true)
  const [catalog, setCatalog] = useState<WorkflowResourceCatalog | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [publishReport, setPublishReport] = useState<WorkflowPublishReport | null>(null)
  const [testPublished, setTestPublished] = useState(false)
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [cacheMetadata, setCacheMetadata] = useState<WorkflowCacheMetadataResult | null>(null)
  const activeRunID = run?.runID
  const activeRunStatus = run?.status
  const activeRunWorkflowID = run?.workflowID

  const loadLibrary = useCallback(async (signal?: AbortSignal) => {
    setLibraryLoading(true)
    setLibraryError(null)
    try {
      const responses = await Promise.all([
        ...(project ? [listWorkflows("project", project, { signal, workspace: project })] : []),
        listWorkflows("global", undefined, { signal, workspace: project }),
      ])
      if (signal?.aborted) return
      setWorkflows(responses.flat().sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)))
    } catch (error) {
      if (!signal?.aborted) setLibraryError(getApiErrorMessage(error))
    } finally {
      if (!signal?.aborted) setLibraryLoading(false)
    }
  }, [project])

  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const response = await getWorkflowResources(project, { signal, workspace: project })
      if (signal?.aborted) return null
      setCatalog(response)
      return response
    } catch (error) {
      if (!signal?.aborted) setCatalogError(getApiErrorMessage(error))
      return null
    } finally {
      if (!signal?.aborted) setCatalogLoading(false)
    }
  }, [project])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutID = window.setTimeout(() => {
      void loadLibrary(controller.signal)
      void loadCatalog(controller.signal)
    }, 0)
    return () => {
      controller.abort()
      window.clearTimeout(timeoutID)
    }
  }, [loadCatalog, loadLibrary])

  useEffect(() => {
    if (!activeRunID || !activeRunWorkflowID || (activeRunStatus !== "queued" && activeRunStatus !== "running")) return
    const runID = activeRunID
    const workflowID = activeRunWorkflowID
    const controller = new AbortController()
    let timer = 0
    async function poll() {
      try {
        const response = await getWorkflowRun(workflowID, runID, { signal: controller.signal, workspace: project })
        if (controller.signal.aborted) return
        setRun(response)
        if (response.status === "queued" || response.status === "running") {
          timer = window.setTimeout(() => void poll(), 1_500)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          toast("執行狀態讀取失敗", getApiErrorMessage(error), "error")
          timer = window.setTimeout(() => void poll(), 3_000)
        }
      }
    }
    timer = window.setTimeout(() => void poll(), 800)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [activeRunID, activeRunStatus, activeRunWorkflowID, project])

  function updateDraft(updater: (current: WorkflowV1) => WorkflowV1) {
    setWorkflow((current) => touchWorkflow(updater(current), {}))
    setDirty(true)
    setTestPublished(false)
  }

  function replaceDraft(next: WorkflowV1) {
    setWorkflow(next)
    setTestPublished(false)
    setPersisted(workflows.some((summary) =>
      summary.id === next.id &&
      summary.scope === next.scope &&
      (next.scope === "global" || summary.project === next.project),
    ))
    setDirty(true)
    setRun(null)
    setPublishReport(null)
  }

  async function save() {
    const shouldInvalidateTest = dirty
    setBusyAction("save")
    try {
      const workflowToSave = syncWorkflowAgentConfigs(normalizeWorkflowSchemaVersion(workflow))
       const validation = await validateWorkflow(workflowToSave, { workspace: project })
      if (!validation.valid) throw new Error(validation.errors.map(issueMessage).join("；") || "Workflow 驗證失敗。")
      const payload = validation.workflow ?? workflowToSave
       const response = persisted ? await updateWorkflow(payload, { workspace: project }) : await createWorkflow(payload, { workspace: project })
      setWorkflow(response.workflow)
      setPersisted(true)
      setDirty(false)
      if (shouldInvalidateTest) setTestPublished(false)
      await loadLibrary()
      toast("Workflow 已儲存", "只保存了 workflow JSON，OpenCode runtime 尚未更新。", "success")
      if (response.warnings.length) toast("儲存完成但有提醒", response.warnings.map(issueMessage).join("；"), "warning")
      return response.workflow
    } catch (error) {
      toast("Workflow 儲存失敗", getApiErrorMessage(error), "error")
      throw error
    } finally {
      setBusyAction(null)
    }
  }

  async function createNew(input: Pick<WorkflowV1, "name" | "description" | "scope">) {
    setBusyAction("create")
    try {
      const draft = createWorkflowDraft(project, input)
      const createPayload: WorkflowCreateInput = { ...draft }
      delete createPayload.id
       const response = await createWorkflow(createPayload, { workspace: project })
      setWorkflow(response.workflow)
      setPersisted(true)
      setDirty(false)
      setTestPublished(false)
      setRun(null)
      setPublishReport(null)
      await loadLibrary()
      toast("Workflow 已建立", "JSON 已保存，尚未發布到 OpenCode。", "success")
    } catch (error) {
      toast("建立 Workflow 失敗", getApiErrorMessage(error), "error")
      throw error
    } finally {
      setBusyAction(null)
    }
  }

  async function createGenerated(nextWorkflow: WorkflowV1) {
    setBusyAction("create-generated")
    try {
       const response = await createWorkflow(nextWorkflow, { workspace: project })
      setWorkflow(response.workflow)
      setPersisted(true)
      setDirty(false)
      setTestPublished(false)
      setRun(null)
      setPublishReport(null)
      await loadLibrary()
      toast("Workflow 專案已建立", "完整 Workflow JSON 已保存，尚未發布到 OpenCode。", "success")
    } catch (error) {
      toast("建立生成的 Workflow 失敗", getApiErrorMessage(error), "error")
      throw error
    } finally {
      setBusyAction(null)
    }
  }

  async function load(summary: WorkflowSummary) {
    setBusyAction("load")
    try {
       const response = await getWorkflow(summary.id, summary.scope, summary.project, { workspace: project })
       const normalized = syncWorkflowAgentConfigs(normalizeWorkflowSchemaVersion(response))
       const prepared = ensureWorkflowCapabilityConnections(normalized)
       setWorkflow(prepared)
       setPersisted(true)
       setDirty(prepared !== normalized)
      setTestPublished(false)
      setRun(null)
      setPublishReport(null)
    } catch (error) {
      toast("載入 Workflow 失敗", getApiErrorMessage(error), "error")
      throw error
    } finally {
      setBusyAction(null)
    }
  }

  async function remove(summary: WorkflowSummary) {
    setBusyAction("delete")
    try {
       const result = await deleteWorkflow(summary.id, summary.scope, summary.project, { workspace: project })
      if (summary.id === workflow.id && summary.scope === workflow.scope) {
         setWorkflow(createWorkflowDraft(project))
         setPersisted(false)
         setDirty(true)
         setTestPublished(false)
        setRun(null)
        setPublishReport(null)
      }
      await loadLibrary()
      const resourcesDeleted = result.resourcesDeleted?.length ?? 0
      toast("Workflow 已刪除", `已移除 Workflow JSON 與 ${resourcesDeleted} 個由此 Workflow 管理的 OpenCode 資源。`, "success")
    } catch (error) {
      toast("刪除 Workflow 失敗", getApiErrorMessage(error), "error")
      throw error
    } finally {
      setBusyAction(null)
    }
  }

  async function exportProjectArchive() {
    if (!project) return
    setBusyAction("export-project")
    try {
      const projectSummaries = workflows.filter((summary) => summary.scope === "project" && summary.project === project)
      if (projectSummaries.length === 0) {
        toast("沒有可匯出的 Project Workflow", "目前專案沒有已儲存的 project-scoped workflow。", "info")
        return
      }

      const exported = await Promise.all(projectSummaries.map((summary) => exportWorkflow(summary.id, "project", project, { workspace: project })))
      downloadBytes(createProjectWorkflowArchive(exported, project), `${project}-workflows.zip`, "application/zip")
      toast("Project Workflow 已匯出", `已下載 ${exported.length} 個 workflow 的壓縮包。`, "success")
    } catch (error) {
      toast("Project Workflow 匯出失敗", getApiErrorMessage(error), "error")
      throw error
    } finally {
      setBusyAction(null)
    }
  }

  async function importProjectArchive(file: File) {
    if (!project) return
    setBusyAction("import-project")
    try {
      const imported = await readProjectWorkflowArchive(file)
      const validated: WorkflowV1[] = []
      for (const workflow of imported) {
        const projectWorkflow = syncWorkflowAgentConfigs(normalizeWorkflowSchemaVersion({ ...workflow, project, scope: "project" }))
        const report = await validateWorkflow(projectWorkflow, { workspace: project })
        if (!report.valid || !report.workflow) {
          throw new Error(`${workflow.name || workflow.id}：${report.errors.map(issueMessage).join("；") || "Workflow 驗證失敗。"}`)
        }
        validated.push(report.workflow)
      }

      for (const workflow of validated) await createWorkflow(workflow, { workspace: project })
      await loadLibrary()
      toast("Project Workflow 已匯入", `已匯入 ${validated.length} 個 workflow；尚未發布到 OpenCode。`, "success")
    } catch (error) {
      toast("Project Workflow 匯入失敗", getApiErrorMessage(error), "error")
      throw error
    } finally {
      setBusyAction(null)
    }
  }

  async function publish(target: WorkflowTarget) {
    setBusyAction(`publish-${target}`)
    try {
       const report = await publishWorkflow(workflow.id, {
        target,
        scope: workflow.scope,
        project: workflow.project,
        restart: true,
        wait: true,
        reason: target === "main" ? "Workflow Builder 正式發布" : "Workflow Builder 測試發布",
       }, { workspace: project })
      setPublishReport(report)
      if (target === "workflow-test") setTestPublished(report.published)
      toast(report.published ? "發布完成" : "發布未完成", `${target} · ${report.restart.status ?? "未重啟"}`, report.published ? "success" : "error")
      return report
    } catch (error) {
      toast("Workflow 發布失敗", getApiErrorMessage(error), "error")
      throw error
    } finally {
      setBusyAction(null)
    }
  }

  async function startRun(target: WorkflowTarget) {
    setBusyAction(`run-${target}`)
    try {
       const response = await runWorkflow(workflow.id, {
        target,
        scope: workflow.scope,
        project: workflow.project,
       }, { workspace: project })
      setRun(response)
      toast("Workflow 已送出執行", `${target} · Run ${response.runID}`, "info")
      return response
    } catch (error) {
      toast("Workflow 執行失敗", getApiErrorMessage(error), "error")
      throw error
    } finally {
      setBusyAction(null)
    }
  }

  async function clearCache(nodeID: string, target: WorkflowTarget) {
    setBusyAction("clear-cache")
    try {
       const result = await clearNodeCache(workflow.id, nodeID, target, workflow.scope, workflow.project, { workspace: project })
      setCacheMetadata((current) => current?.nodeID === nodeID && current.target === target ? { ...current, cache: null } : current)
      toast("Node cache 已處理", result.deleted ? `${target} cache 已清除；若 node 保持鎖定，下次執行將會失敗。` : "找不到可清除的 cache。", result.deleted ? "success" : "info")
    } catch (error) {
      toast("清除 cache 失敗", getApiErrorMessage(error), "error")
      throw error
    } finally {
      setBusyAction(null)
    }
  }

  const loadCache = useCallback(async (nodeID: string, target: WorkflowTarget, signal?: AbortSignal) => {
    if (!persisted) {
      setCacheMetadata(null)
      return
    }
    try {
       const result = await getNodeCache(workflow.id, nodeID, target, workflow.scope, workflow.project, { signal, workspace: project })
      if (!signal?.aborted) setCacheMetadata(result)
    } catch (error) {
      if (!signal?.aborted) {
        setCacheMetadata(null)
        toast("Cache 狀態讀取失敗", getApiErrorMessage(error), "error")
      }
    }
  }, [persisted, project, workflow.id, workflow.project, workflow.scope])

  return {
    busyAction,
    cacheMetadata,
    catalog,
    catalogError,
    catalogLoading,
    clearCache,
    createNew,
    createGenerated,
    dirty,
    exportProjectArchive,
    importProjectArchive,
    libraryError,
    libraryLoading,
    load,
    loadCatalog,
    loadCache,
    persisted,
    publish,
    publishReport,
    remove,
    replaceDraft,
    run,
    save,
    startRun,
    testPublished,
    updateDraft,
     validateImport: (nextWorkflow: WorkflowV1, options: { signal?: AbortSignal } = {}) => validateWorkflow(nextWorkflow, { ...options, workspace: project }),
    workflow,
    workflows,
  }
}

function toast(title: string, description: string, type: "success" | "error" | "warning" | "info") {
  toastManager.add({ id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2)}`, title, description, type })
}
