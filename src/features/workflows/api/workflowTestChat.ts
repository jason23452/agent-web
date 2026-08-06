import { apiRequest } from "@/shared/api"
import type { WorkflowScope, WorkflowTestChatMessage, WorkflowTestChatSession, WorkflowV1 } from "@/features/workflows/types"

export const PROMPT_WRITER_WORKFLOW_ID = "workflow-node-prompt-writer"
export const WORKFLOW_GENERATOR_WORKFLOW_ID = "workflow-generator"
export const WORKFLOW_UPDATER_WORKFLOW_ID = "workflow-updater"
export const FILE_PREVIEW_EDITOR_WORKFLOW_ID = "workflow-file-preview-editor"

export const RESOURCE_WRITER_WORKFLOW_IDS = {
  agent: "workflow-agent-writer",
  command: "workflow-command-writer",
  mcp: "workflow-mcp-writer",
  plugin: "workflow-plugin-writer",
  skill: "workflow-skill-creator",
  tool: "workflow-tool-writer",
} as const

export type ResourceWriterType = keyof typeof RESOURCE_WRITER_WORKFLOW_IDS
export type WorkflowSystemCommandInput = string | Record<string, unknown>
export type WorkflowRuntimeSelection = {
  model?: string
  variant?: string
}
export type WorkflowSystemCommandOptions = WorkflowRuntimeSelection & {
  signal?: AbortSignal
  workspace?: string
}

function normalizeSystemCommandOptions(optionsOrSignal?: WorkflowSystemCommandOptions | AbortSignal, legacyWorkspace?: string): WorkflowSystemCommandOptions {
  if (optionsOrSignal && typeof optionsOrSignal === "object" && "aborted" in optionsOrSignal) {
    return { signal: optionsOrSignal as AbortSignal, workspace: legacyWorkspace }
  }
  return optionsOrSignal ?? {}
}
export type WorkflowUpdaterInput = {
  project: string
  request: string
  workflow: WorkflowV1
}

export function getResourceWriterWorkflowID(resourceType: string) {
  return resourceType in RESOURCE_WRITER_WORKFLOW_IDS
    ? RESOURCE_WRITER_WORKFLOW_IDS[resourceType as ResourceWriterType]
    : null
}

type WorkflowTestChatLocation = {
  scope: WorkflowScope
  project?: string
}

function workspaceHeaders(workspace?: string): HeadersInit | undefined {
  return workspace?.trim() ? { "x-agent-system-workspace": workspace.trim() } : undefined
}

export function createWorkflowTestChatSession(id: string, location: WorkflowTestChatLocation, signal?: AbortSignal, workspace?: string) {
  return apiRequest<WorkflowTestChatSession>(`/bff/workflows/${encodeURIComponent(id)}/test-chat/sessions`, {
    body: location,
    headers: workspaceHeaders(workspace),
    method: "POST",
    signal,
  })
}

export function sendWorkflowTestChatMessage(
  id: string,
  sessionID: string,
  location: WorkflowTestChatLocation & { model?: string; text: string; variant?: string },
  signal?: AbortSignal,
  workspace?: string,
) {
  return apiRequest<WorkflowTestChatMessage>(`/bff/workflows/${encodeURIComponent(id)}/test-chat/sessions/${encodeURIComponent(sessionID)}/messages`, {
    body: location,
    headers: workspaceHeaders(workspace),
    method: "POST",
    signal,
  })
}

export async function runWorkflowSystemCommand(workflowID: string, input: WorkflowSystemCommandInput, optionsOrSignal?: WorkflowSystemCommandOptions | AbortSignal, legacyWorkspace?: string) {
  const options = normalizeSystemCommandOptions(optionsOrSignal, legacyWorkspace)
  const session = await createWorkflowTestChatSession(workflowID, { scope: "global" }, options.signal, options.workspace)
  const text = typeof input === "string" ? input : JSON.stringify(input)
  return sendWorkflowTestChatMessage(workflowID, session.sessionID, {
    scope: "global",
    text,
    ...(options.model ? { model: options.model } : {}),
    ...(options.variant ? { variant: options.variant } : {}),
  }, options.signal, options.workspace)
}

export async function runPromptWriterForNode(workflow: WorkflowV1, targetNodeID: string, request: string, options: WorkflowSystemCommandOptions = {}) {
  return runWorkflowSystemCommand(PROMPT_WRITER_WORKFLOW_ID, {
    targetNodeID,
    request: request.trim(),
    workflow,
  }, { ...options, workspace: options.workspace ?? workflow.project })
}

export function runWorkflowUpdater(input: WorkflowUpdaterInput, options: WorkflowSystemCommandOptions = {}) {
  const project = input.project.trim()
  return runWorkflowSystemCommand(WORKFLOW_UPDATER_WORKFLOW_ID, {
    project,
    request: input.request.trim(),
    workflow: input.workflow,
  }, { ...options, workspace: options.workspace ?? project })
}
