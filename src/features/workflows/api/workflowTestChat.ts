import { apiRequest } from "@/shared/api"
import type { WorkflowScope, WorkflowTestChatMessage, WorkflowTestChatSession, WorkflowV1 } from "@/features/workflows/types"

export const PROMPT_WRITER_WORKFLOW_ID = "workflow-node-prompt-writer"

type WorkflowTestChatLocation = {
  scope: WorkflowScope
  project?: string
}

export function createWorkflowTestChatSession(id: string, location: WorkflowTestChatLocation, signal?: AbortSignal) {
  return apiRequest<WorkflowTestChatSession>(`/bff/workflows/${encodeURIComponent(id)}/test-chat/sessions`, {
    body: location,
    method: "POST",
    signal,
  })
}

export function sendWorkflowTestChatMessage(
  id: string,
  sessionID: string,
  location: WorkflowTestChatLocation & { model?: string; text: string; variant?: string },
  signal?: AbortSignal,
) {
  return apiRequest<WorkflowTestChatMessage>(`/bff/workflows/${encodeURIComponent(id)}/test-chat/sessions/${encodeURIComponent(sessionID)}/messages`, {
    body: location,
    method: "POST",
    signal,
  })
}

export async function runPromptWriterForNode(workflow: WorkflowV1, targetNodeID: string, request: string, signal?: AbortSignal) {
  const session = await createWorkflowTestChatSession(PROMPT_WRITER_WORKFLOW_ID, { scope: "global" }, signal)
  const text = [
    "請使用官方 plan Agent 完整規劃後，再由 prompt-writer-agent 為目前 target node 建立可直接回寫的 prompt。",
    "",
    "使用者需求：",
    request.trim(),
    "",
    `Target node ID: ${targetNodeID}`,
    "",
    "完整 target workflow JSON：",
    JSON.stringify(workflow, null, 2),
  ].join("\n")
  return sendWorkflowTestChatMessage(PROMPT_WRITER_WORKFLOW_ID, session.sessionID, { scope: "global", text }, signal)
}
