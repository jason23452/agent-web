import { ChatComposer } from "@/features/workspace/components/ChatComposer"
import { ChatMessageList } from "@/features/workspace/components/ChatMessageList"
import { WorkspaceTopbar } from "@/features/workspace/components/WorkspaceTopbar"
import type { Agent, Attachment, PinContext } from "@/features/workspace/types/workspace"

type ChatPaneProps = {
  activeAgent: Agent
  activeProjectPath: string
  agents: Agent[]
  attachments: Attachment[]
  onAddAttachment: () => void
  onAgentChange: (agentId: string) => void
  onClearPin: () => void
  onOpenContextPanel: () => void
  onOpenSidebar: () => void
  onRemoveAttachment: (id: string) => void
  pinContext: PinContext | null
}

export function ChatPane({
  activeAgent,
  activeProjectPath,
  agents,
  attachments,
  onAddAttachment,
  onAgentChange,
  onClearPin,
  onOpenContextPanel,
  onOpenSidebar,
  onRemoveAttachment,
  pinContext,
}: ChatPaneProps) {
  return (
    <main className="grid min-h-dvh min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-background" data-region="chat-main">
      <WorkspaceTopbar
        activeAgent={activeAgent}
        activeProjectPath={activeProjectPath}
        agents={agents}
        onAgentChange={onAgentChange}
        onOpenContextPanel={onOpenContextPanel}
        onOpenSidebar={onOpenSidebar}
      />
      <ChatMessageList activeAgent={activeAgent} />
      <ChatComposer
        attachments={attachments}
        onAddAttachment={onAddAttachment}
        onClearPin={onClearPin}
        onRemoveAttachment={onRemoveAttachment}
        pinContext={pinContext}
      />
    </main>
  )
}
