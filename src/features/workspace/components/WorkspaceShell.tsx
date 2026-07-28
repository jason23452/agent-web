import { useState } from "react"
import { ChatPane } from "@/features/workspace/components/ChatPane"
import { ContextPanel } from "@/features/workspace/components/ContextPanel"
import { FilePreviewDialog } from "@/features/workspace/components/FilePreviewDialog"
import { SessionSidebar } from "@/features/workspace/components/SessionSidebar"
import { agents, starterAttachments } from "@/features/workspace/data/mockWorkspace"
import type { Attachment, FileNode, PinContext } from "@/features/workspace/types/workspace"

export function WorkspaceShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState(agents[0]!.id)
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null)
  const [pinContext, setPinContext] = useState<PinContext | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const activeAgent = agents.find((agent) => agent.id === activeAgentId) ?? agents[0]!

  function addAttachment() {
    const next = starterAttachments.find((item) => !attachments.some((attachment) => attachment.id === item.id))
    if (next) setAttachments((current) => [...current, next])
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id))
  }

  function closeMobileSurfaces() {
    setSidebarOpen(false)
    setContextPanelOpen(false)
  }

  return (
    <section className="min-h-dvh bg-muted/40 text-foreground min-[761px]:grid min-[761px]:grid-cols-[240px_minmax(0,1fr)] min-[1181px]:grid-cols-[260px_minmax(0,1fr)_332px]" aria-label="AICaht OpenCode agent 工作區">
      <SessionSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSelectSession={closeMobileSurfaces} />
      <ChatPane
        activeAgent={activeAgent}
        agents={agents}
        attachments={attachments}
        onAddAttachment={addAttachment}
        onAgentChange={setActiveAgentId}
        onClearPin={() => setPinContext(null)}
        onOpenContextPanel={() => setContextPanelOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
        onRemoveAttachment={removeAttachment}
        pinContext={pinContext}
      />
      <ContextPanel open={contextPanelOpen} onClose={() => setContextPanelOpen(false)} onPreviewFile={setPreviewFile} />
      <FilePreviewDialog
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onPin={(context) => {
          setPinContext(context)
          setPreviewFile(null)
        }}
      />

      {sidebarOpen && (
        <button
          aria-label="關閉側欄遮罩"
          className="fixed inset-0 z-30 bg-black/20 min-[761px]:hidden"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      )}
      {contextPanelOpen && (
        <button
          aria-label="關閉上下文面板遮罩"
          className="fixed inset-0 z-30 bg-black/20 min-[1181px]:hidden"
          onClick={() => setContextPanelOpen(false)}
          type="button"
        />
      )}
    </section>
  )
}
