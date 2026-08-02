import { apiRequest } from "@/shared/api"
import type {
  WorkflowCacheClearResult,
  WorkflowCacheMetadataResult,
  WorkflowPublishReport,
  WorkflowResourceCatalog,
  WorkflowRun,
  WorkflowSaveResult,
  WorkflowScope,
  WorkflowSummary,
  WorkflowTarget,
  WorkflowV1,
  WorkflowValidationResult,
} from "@/features/workflows/types"

type RequestOptions = { signal?: AbortSignal }

export async function getWorkflowResources(project?: string, options: RequestOptions = {}) {
  return apiRequest<WorkflowResourceCatalog>("/bff/workflow-resources", {
    query: { project, includeGlobal: true },
    signal: options.signal,
  })
}

export async function listWorkflows(scope: WorkflowScope, project?: string, options: RequestOptions = {}) {
  const response = await apiRequest<WorkflowSummary[] | { workflows: WorkflowSummary[] }>("/bff/workflows", {
    query: { scope, project },
    signal: options.signal,
  })
  return Array.isArray(response) ? response : response.workflows
}

export async function getWorkflow(id: string, scope: WorkflowScope, project?: string, options: RequestOptions = {}) {
  const response = await apiRequest<WorkflowV1 | { workflow: WorkflowV1 }>(`/bff/workflows/${encodeURIComponent(id)}`, {
    query: { scope, project },
    signal: options.signal,
  })
  return "workflow" in response ? response.workflow : response
}

export function createWorkflow(workflow: WorkflowV1, options: RequestOptions = {}) {
  return apiRequest<WorkflowSaveResult>("/bff/workflows", {
    body: { workflow },
    method: "POST",
    signal: options.signal,
  })
}

export function updateWorkflow(workflow: WorkflowV1, options: RequestOptions = {}) {
  return apiRequest<WorkflowSaveResult>(`/bff/workflows/${encodeURIComponent(workflow.id)}`, {
    body: { workflow },
    method: "PATCH",
    signal: options.signal,
  })
}

export function deleteWorkflow(id: string, scope: WorkflowScope, project?: string, options: RequestOptions = {}) {
  return apiRequest<{ deleted: boolean }>(`/bff/workflows/${encodeURIComponent(id)}`, {
    method: "DELETE",
    query: { scope, project },
    signal: options.signal,
  })
}

export function validateWorkflow(workflow: WorkflowV1, options: RequestOptions = {}) {
  return apiRequest<WorkflowValidationResult>("/bff/workflows/validate", {
    body: { workflow },
    method: "POST",
    signal: options.signal,
  })
}

export function importWorkflow(workflow: WorkflowV1, options: RequestOptions = {}) {
  return apiRequest<WorkflowValidationResult>("/bff/workflows/import", {
    body: { workflow },
    method: "POST",
    signal: options.signal,
  })
}

export async function exportWorkflow(id: string, scope: WorkflowScope, project?: string, options: RequestOptions = {}) {
  const response = await apiRequest<WorkflowV1 | { workflow: WorkflowV1 }>(
    `/bff/workflows/${encodeURIComponent(id)}/export`,
    { query: { scope, project }, signal: options.signal },
  )
  return "workflow" in response ? response.workflow : response
}

export function publishWorkflow(
  id: string,
  request: {
    target: WorkflowTarget
    scope: WorkflowScope
    project?: string
    restart?: boolean
    wait?: boolean
    reason?: string
  },
  options: RequestOptions = {},
) {
  return apiRequest<WorkflowPublishReport>(`/bff/workflows/${encodeURIComponent(id)}/publish`, {
    body: request,
    method: "POST",
    signal: options.signal,
  })
}

export async function runWorkflow(
  id: string,
  request: { target: WorkflowTarget; scope: WorkflowScope; project?: string; input?: Record<string, unknown> },
  options: RequestOptions = {},
) {
  const response = await apiRequest<WorkflowRun | { run: WorkflowRun }>(
    `/bff/workflows/${encodeURIComponent(id)}/runs`,
    { body: request, method: "POST", signal: options.signal },
  )
  return normalizeRun("run" in response ? response.run : response)
}

export async function getWorkflowRun(id: string, runID: string, options: RequestOptions = {}) {
  const response = await apiRequest<WorkflowRun | { run: WorkflowRun }>(
    `/bff/workflows/${encodeURIComponent(id)}/runs/${encodeURIComponent(runID)}`,
    { signal: options.signal },
  )
  return normalizeRun("run" in response ? response.run : response)
}

export function clearNodeCache(
  id: string,
  nodeID: string,
  target: WorkflowTarget,
  scope: WorkflowScope,
  project?: string,
  options: RequestOptions = {},
) {
  return apiRequest<WorkflowCacheClearResult>(
    `/bff/workflows/${encodeURIComponent(id)}/nodes/${encodeURIComponent(nodeID)}/cache`,
    { method: "DELETE", query: { target, scope, project }, signal: options.signal },
  )
}

export function getNodeCache(
  id: string,
  nodeID: string,
  target: WorkflowTarget,
  scope: WorkflowScope,
  project?: string,
  options: RequestOptions = {},
) {
  return apiRequest<WorkflowCacheMetadataResult>(
    `/bff/workflows/${encodeURIComponent(id)}/nodes/${encodeURIComponent(nodeID)}/cache`,
    { query: { target, scope, project }, signal: options.signal },
  )
}

function normalizeRun(run: WorkflowRun): WorkflowRun {
  return { ...run, steps: Array.isArray(run.steps) ? run.steps : [] }
}
