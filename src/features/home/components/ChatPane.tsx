import { ChevronRightIcon } from "lucide-react"
import { ChatMessageList } from "@/features/home/components/ChatMessageList"
import type { WorkspaceMessage } from "@/shared/types/workspace"

type ChatPaneProps = {
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
}

export function ChatPane({ error, getSessionHref, loading = false, messages, onSelectSession, sessionBreadcrumb }: ChatPaneProps) {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background" data-region="chat-main">
      {sessionBreadcrumb && (
        <nav aria-label="Subagent session 路徑" className="shrink-0 border-border/70 border-b bg-background/95 px-3 py-2.5 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[820px] items-center gap-1.5 text-sm">
            <button className="min-w-0 truncate rounded-md px-1.5 py-1 font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={sessionBreadcrumb.onParentSelect} type="button">
              {sessionBreadcrumb.parentTitle}
            </button>
            <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/60" />
            <span aria-current="page" className="min-w-0 truncate px-1.5 py-1 font-medium text-foreground">{sessionBreadcrumb.childTitle}</span>
          </div>
        </nav>
      )}
      <ChatMessageList error={error} getSessionHref={getSessionHref} loading={loading} messages={messages} onSelectSession={onSelectSession} />
    </main>
  )
}
