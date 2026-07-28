import { ChatMessageList } from "@/features/home/components/ChatMessageList"

export function ChatPane() {
  return (
    <main className="min-h-0 min-w-0 bg-background" data-region="chat-main">
      <ChatMessageList />
    </main>
  )
}
