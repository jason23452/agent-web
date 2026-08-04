import { ChatPane } from "@/features/home/components/ChatPane"
import type { WorkspaceMessage } from "@/shared/types/workspace"

export const WORKSPACE_PROJECT_ROUTE_PREFIX = "/workspace"

export function WorkspaceProjectRoute({ error, getSessionHref, loading, messages, onSelectSession, sessionBreadcrumb }: {
  error?: string | null
  getSessionHref?: (sessionId: string) => string
  loading?: boolean
  messages: WorkspaceMessage[]
  onSelectSession?: (sessionId: string) => void
  sessionBreadcrumb?: {
    childTitle: string
    onParentSelect: () => void
    parentTitle: string
  }
}) {
  return <ChatPane error={error} getSessionHref={getSessionHref} loading={loading} messages={messages} onSelectSession={onSelectSession} sessionBreadcrumb={sessionBreadcrumb} />
}
