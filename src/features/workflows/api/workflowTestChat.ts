import { apiRequest } from "@/shared/api"
import type { WorkflowScope, WorkflowTestChatMessage, WorkflowTestChatSession } from "@/features/workflows/types"

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
