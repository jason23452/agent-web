import { ChatMessageList } from "@/features/home/components/ChatMessageList"
import type { WorkspaceMessage } from "@/shared/types/workspace"

export function ChatPane({ error, loading = false, messages }: { error?: string | null; loading?: boolean; messages: WorkspaceMessage[] }) {
  return (
    <main className="min-h-0 min-w-0 bg-background" data-region="chat-main">
      <ChatMessageList error={error} loading={loading} messages={messages} />
    </main>
  )
}
