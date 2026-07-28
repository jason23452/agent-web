import { ChatComposer } from "@/features/home/components/ChatComposer"
import { ChatMessageList } from "@/features/home/components/ChatMessageList"

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

type ChatPaneProps = {
  attachments: ChatPaneAttachment[]
  onAddAttachment: () => void
  onClearPin: () => void
  onRemoveAttachment: (id: string) => void
  pinContext: ChatPanePinContext | null
}

export function ChatPane({ attachments, onAddAttachment, onClearPin, onRemoveAttachment, pinContext }: ChatPaneProps) {
  return (
    <main className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] bg-background" data-region="chat-main">
      <ChatMessageList />
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
