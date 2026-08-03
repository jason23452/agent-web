import { useCallback, useEffect, useState } from "react"
import { getApiErrorMessage } from "@/shared/api"
import { toastManager } from "@/shared/components/ui/toast"
import {
  clearNodeCache,
  createWorkflow,
  deleteWorkflow,
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
import { createWorkflowDraft, issueMessage, normalizeWorkflowSchemaVersion, syncWorkflowAgentConfigs, touchWorkflow } from "@/features/workflows/workflowUtils"

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
        ...(project ? [listWorkflows("project", project, { signal })] : []),
        listWorkflows("global", undefined, { signal }),
      ])
      if (signal?.aborted) return
      setWorkflows(responses.flat().sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)))
    } catch (error) {
      if (!signal?.aborted) setLibraryError(getApiErrorMessage(error))
    } finally {
      if (!signal?.aborted) setLibraryLoading(false)
    }
  }, [project])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutID = window.setTimeout(() => {
      void loadLibrary(controller.signal)
      setCatalogLoading(true)
      setCatalogError(null)
      void getWorkflowResources(project, { signal: controller.signal })
        .then((response) => {
          if (!controller.signal.aborted) setCatalog(response)
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setCatalogError(getApiErrorMessage(error))
        })
        .finally(() => {
          if (!controller.signal.aborted) setCatalogLoading(false)
        })
    }, 0)
    return () => {
      controller.abort()
      window.clearTimeout(timeoutID)
    }
  }, [loadLibrary, project])

  useEffect(() => {
    if (!activeRunID || !activeRunWorkflowID || (activeRunStatus !== "queued" && activeRunStatus !== "running")) return
    const runID = activeRunID
    const workflowID = activeRunWorkflowID
    const controller = new AbortController()
    let timer = 0
    async function poll() {
      try {
        const response = await getWorkflowRun(workflowID, runID, { signal: controller.signal })
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
  }, [activeRunID, activeRunStatus, activeRunWorkflowID])

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
      const validation = await validateWorkflow(workflowToSave)
      if (!validation.valid) throw new Error(validation.errors.map(issueMessage).join("；") || "Workflow 驗證失敗。")
      const payload = validation.workflow ?? workflowToSave
      const response = persisted ? await updateWorkflow(payload) : await createWorkflow(payload)
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
      const response = await createWorkflow(createPayload)
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
      const response = await createWorkflow(nextWorkflow)
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
      const response = await getWorkflow(summary.id, summary.scope, summary.project)
      setWorkflow(syncWorkflowAgentConfigs(normalizeWorkflowSchemaVersion(response)))
      setPersisted(true)
      setDirty(false)
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
      const result = await deleteWorkflow(summary.id, summary.scope, summary.project)
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
      })
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
      })
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
      const result = await clearNodeCache(workflow.id, nodeID, target, workflow.scope, workflow.project)
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
      const result = await getNodeCache(workflow.id, nodeID, target, workflow.scope, workflow.project, { signal })
      if (!signal?.aborted) setCacheMetadata(result)
    } catch (error) {
      if (!signal?.aborted) {
        setCacheMetadata(null)
        toast("Cache 狀態讀取失敗", getApiErrorMessage(error), "error")
      }
    }
  }, [persisted, workflow.id, workflow.project, workflow.scope])

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
    libraryError,
    libraryLoading,
    load,
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
    validateImport: validateWorkflow,
    workflow,
    workflows,
  }
}

function toast(title: string, description: string, type: "success" | "error" | "warning" | "info") {
  toastManager.add({ id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2)}`, title, description, type })
}
