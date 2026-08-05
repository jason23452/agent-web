import { apiRequest } from "@/shared/api"
import type { WorkflowScope, WorkflowTestChatMessage, WorkflowTestChatSession, WorkflowV1 } from "@/features/workflows/types"

export const PROMPT_WRITER_WORKFLOW_ID = "workflow-node-prompt-writer"
export const WORKFLOW_GENERATOR_WORKFLOW_ID = "workflow-generator"
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

export async function runWorkflowSystemCommand(workflowID: string, text: string, signal?: AbortSignal, workspace?: string) {
  const session = await createWorkflowTestChatSession(workflowID, { scope: "global" }, signal, workspace)
  return sendWorkflowTestChatMessage(workflowID, session.sessionID, { scope: "global", text }, signal, workspace)
}

export async function runPromptWriterForNode(workflow: WorkflowV1, targetNodeID: string, request: string, signal?: AbortSignal, workspace?: string) {
  const text = [
    "請先由 coordinator 驗證輸入並整理 planning brief，再委派 prompt-writer-agent 為目前 target node 建立可直接回寫的 prompt。",
    "",
    "使用者需求：",
    request.trim(),
    "",
    `Target node ID: ${targetNodeID}`,
    "",
    "完整 target workflow JSON：",
    JSON.stringify(workflow, null, 2),
  ].join("\n")
  return runWorkflowSystemCommand(PROMPT_WRITER_WORKFLOW_ID, text, signal, workspace ?? workflow.project)
}
