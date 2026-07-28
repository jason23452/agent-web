import { ChatPane, type ChatPaneAgent, type ChatPaneAttachment, type ChatPaneMessage, type ChatPanePinContext } from "@/features/home/components/ChatPane"

export const HOME_ROUTE_PATH = "/"

type HomeRouteProps = {
  activeAgent: ChatPaneAgent
  attachments: ChatPaneAttachment[]
  messages: ChatPaneMessage[]
  onAddAttachment: () => void
  onClearPin: () => void
  onRemoveAttachment: (id: string) => void
  pinContext: ChatPanePinContext | null
}

export function HomeRoute({
  activeAgent,
  attachments,
  messages,
  onAddAttachment,
  onClearPin,
  onRemoveAttachment,
  pinContext,
}: HomeRouteProps) {
  return (
    <ChatPane
      activeAgent={activeAgent}
      attachments={attachments}
      messages={messages}
      onAddAttachment={onAddAttachment}
      onClearPin={onClearPin}
      onRemoveAttachment={onRemoveAttachment}
      pinContext={pinContext}
    />
  )
}
