import { ChatPane } from "@/features/home/components/ChatPane"
import type { WorkspaceMessage } from "@/shared/types/workspace"

export const WORKSPACE_ROUTE_PATH = "/workspace"

export function WorkspaceRoute({ error, loading, messages }: { error?: string | null; loading?: boolean; messages: WorkspaceMessage[] }) {
  return <ChatPane error={error} loading={loading} messages={messages} />
}
