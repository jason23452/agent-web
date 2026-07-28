import { ChatComposer } from "@/features/home/components/ChatComposer"
import { ChatMessageList, type ChatMessage } from "@/features/home/components/ChatMessageList"

export type ChatPaneAgent = {
  id: string
  name: string
  provider: string
  status: "active" | "idle" | "review"
}

export type ChatPaneAttachment = {
  id: string
  name: string
  meta: string
  isImage?: boolean
}

export type ChatPanePinContext = {
  label: string
  meta: string
  text: string
}

export type ChatPaneMessage = ChatMessage

type ChatPaneProps = {
  activeAgent: ChatPaneAgent
  attachments: ChatPaneAttachment[]
  messages: ChatPaneMessage[]
  onAddAttachment: () => void
  onClearPin: () => void
  onRemoveAttachment: (id: string) => void
  pinContext: ChatPanePinContext | null
}

export function ChatPane({
  activeAgent,
  attachments,
  messages,
  onAddAttachment,
  onClearPin,
  onRemoveAttachment,
  pinContext,
}: ChatPaneProps) {
  return (
    <main className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] bg-background" data-region="chat-main">
      <ChatMessageList activeAgent={activeAgent} messages={messages} />
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
