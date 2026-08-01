import { ChatPane } from "@/features/home/components/ChatPane"
import type { WorkspaceMessage } from "@/shared/types/workspace"

export const HOME_ROUTE_PATH = "/"

export function HomeRoute({ error, loading, messages }: { error?: string | null; loading?: boolean; messages?: WorkspaceMessage[] }) {
  return <ChatPane error={error} loading={loading} messages={messages ?? []} />
}
