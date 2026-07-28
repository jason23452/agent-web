import { ChatPane, type ChatPaneAttachment, type ChatPanePinContext } from "@/features/home/components/ChatPane"

export const HOME_ROUTE_PATH = "/"

type HomeRouteProps = {
  attachments: ChatPaneAttachment[]
  onAddAttachment: () => void
  onClearPin: () => void
  onRemoveAttachment: (id: string) => void
  pinContext: ChatPanePinContext | null
}

export function HomeRoute({ attachments, onAddAttachment, onClearPin, onRemoveAttachment, pinContext }: HomeRouteProps) {
  return (
    <ChatPane
      attachments={attachments}
      onAddAttachment={onAddAttachment}
      onClearPin={onClearPin}
      onRemoveAttachment={onRemoveAttachment}
      pinContext={pinContext}
    />
  )
}
