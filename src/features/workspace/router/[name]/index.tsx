import { ChatPane } from "@/features/home/components/ChatPane"
import type { WorkspaceMessage } from "@/shared/types/workspace"

export const WORKSPACE_PROJECT_ROUTE_PREFIX = "/workspace"

export function WorkspaceProjectRoute({ error, loading, messages }: { error?: string | null; loading?: boolean; messages: WorkspaceMessage[] }) {
  return <ChatPane error={error} loading={loading} messages={messages} />
}
