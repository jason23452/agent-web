import {
  BotIcon,
  CheckIcon,
  CircleDashedIcon,
  Code2Icon,
  FileIcon,
  PaperclipIcon,
  PenLineIcon,
  PinIcon,
  RotateCcwIcon,
  SaveIcon,
  SendIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { type ChangeEvent, useEffect, useRef, useState } from "react"
import { FILE_PREVIEW_EDITOR_WORKFLOW_ID, runWorkflowSystemCommand } from "@/features/workflows/api/workflowTestChat"
import { getApiErrorMessage } from "@/shared/api"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/shared/components/ui/tabs"
import { Skeleton } from "@/shared/components/ui/skeleton"
import type { FileNode, PinContext } from "@/shared/types/workspace"
import { cn } from "@/shared/utils/cn"

type AppFilePreviewFile = FileNode
type AppFilePreviewPinContext = PinContext

type AppFilePreviewDialogProps = {
  file: AppFilePreviewFile | null
  onClose: () => void
  onLibraryUpload?: () => void
  onLocalUpload?: (file: File) => void
  onSaveFile?: (file: AppFilePreviewFile, content: string) => Promise<void>
  workspace?: string
}

type WorkTab = "edit" | "agent"

type SelectionPin = AppFilePreviewPinContext & {
  left: number
  top: number
}

type SelectionLineRange = {
  start: number
  end: number
}

function getFilePreviewContent(file: AppFilePreviewFile) {
  if (file.contentType === "binary") {
    return `/* ${file.name} */\n此為二進位檔案，無法直接以文字預覽。`
  }

  return file.content ?? ""
}

function getFileRevisionKey(file: AppFilePreviewFile) {
  const text = file.content ?? ""
  let hash = 0

  for (let index = 0; index < text.length; index++) {
    hash = (hash << 5) - hash + text.charCodeAt(index)
    hash &= hash
  }

  return [
    file.id,
    file.contentType ?? "",
    file.contentLoading ? "loading" : "loaded",
    file.contentError ?? "",
    text.length,
    Math.abs(hash).toString(36),
  ].join("|")
}

function summarizeText(text: string, limit = 240) {
  const compact = text.replace(/\s+/g, " ").trim()
  return compact.length > limit ? `${compact.slice(0, limit)}...` : compact
}

type FilePreviewEditResult = {
  schemaVersion: "agent-system.file-preview-edit.v1"
  ok: boolean
  filePath: string
  summary: string
  proposedContent: string
  warnings: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function parseFilePreviewEditResult(text: string): FilePreviewEditResult | null {
  const trimmed = text.trim()
  const candidates = trimmed ? [trimmed] : []
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1))

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate)
      if (!isRecord(parsed) || parsed.schemaVersion !== "agent-system.file-preview-edit.v1") continue
      if (typeof parsed.ok !== "boolean" || typeof parsed.filePath !== "string" || typeof parsed.summary !== "string" || typeof parsed.proposedContent !== "string") continue
      if (!Array.isArray(parsed.warnings) || !parsed.warnings.every((warning): warning is string => typeof warning === "string")) continue

      return {
        schemaVersion: parsed.schemaVersion,
        ok: parsed.ok,
        filePath: parsed.filePath,
        summary: parsed.summary,
        proposedContent: parsed.proposedContent,
        warnings: parsed.warnings,
      }
    } catch {
      // Try the next candidate when the runtime adds text around the JSON.
    }
  }

  return null
}

export function AppFilePreviewDialog({
  file,
  onClose,
  onLibraryUpload,
  onLocalUpload,
  onSaveFile,
  workspace,
}: AppFilePreviewDialogProps) {
  if (!file) return null
  const fileKey = getFileRevisionKey(file)

  return (
    <AppFilePreviewDialogContent
      file={file}
      key={fileKey}
      onClose={onClose}
      onLibraryUpload={onLibraryUpload}
      onLocalUpload={onLocalUpload}
      onSaveFile={onSaveFile}
      workspace={workspace}
    />
  )
}

function AppFilePreviewDialogContent({
  file,
  onClose,
  onLibraryUpload,
  onLocalUpload,
  onSaveFile,
  workspace,
}: {
  file: AppFilePreviewFile
  onClose: () => void
  onLibraryUpload?: () => void
  onLocalUpload?: (file: File) => void
  onSaveFile?: (file: AppFilePreviewFile, content: string) => Promise<void>
  workspace?: string
}) {
  const isLoadingContent = file.contentLoading
  const hasContentError = Boolean(file.contentError)
  const initialContent = getFilePreviewContent(file)
  const [activeTab, setActiveTab] = useState<WorkTab>("agent")
  const [savedContent, setSavedContent] = useState(initialContent)
  const [draftContent, setDraftContent] = useState(initialContent)
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [agentResult, setAgentResult] = useState<FilePreviewEditResult | null>(null)
  const [agentBusy, setAgentBusy] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [projectDirty, setProjectDirty] = useState(false)
  const [editStatus, setEditStatus] = useState("未修改")
  const [selectionPin, setSelectionPin] = useState<SelectionPin | null>(null)
  const [dialogPins, setDialogPins] = useState<AppFilePreviewPinContext[]>([])
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [selectionLineRange, setSelectionLineRange] = useState<SelectionLineRange | null>(null)
  const previewSectionRef = useRef<HTMLElement>(null)
  const previewCodeRef = useRef<HTMLPreElement>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const agentControllerRef = useRef<AbortController | null>(null)

  const metadata = [file.size, file.date, file.type.toUpperCase()].filter(Boolean).join(" · ")
  const metadataText = metadata || file.type.toUpperCase()
  const lines = savedContent.split("\n")
  const draftChanged = draftContent !== savedContent
  const agentSourceContent = draftChanged ? draftContent : savedContent
  const canRunAgent = Boolean(workspace?.trim())
    && !isLoadingContent
    && !hasContentError
    && file.contentType === "text"
    && file.type !== "img"
  const canSaveFile = Boolean(onSaveFile)
    && !isLoadingContent
    && !hasContentError
    && file.contentType === "text"
    && file.type !== "img"

  function handleLibraryUpload() {
    onLibraryUpload?.()
    setPrompt((current) => current || "請參考檔案庫中的相關資料，協助修改這個檔案。")
    setAttachMenuOpen(false)
  }

  function handleLocalUpload() {
    setAttachMenuOpen(false)
    fileInputRef.current?.click()
  }

  function handleLocalUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const pickedFile = event.target.files?.[0] ?? null
    if (!pickedFile) {
      event.target.value = ""
      return
    }

    onLocalUpload?.(pickedFile)
    setPrompt((current) => current || `請參考 ${pickedFile.name}，並協助修改 ${file.name}。`)
    event.target.value = ""
    setAttachMenuOpen(false)
  }

  function saveDraft() {
    setSavedContent(draftContent)
    setProjectDirty(true)
    setEditStatus("已套用到預覽")
    setSelectionPin(null)
    setSelectionLineRange(null)
  }

  function resetDraft() {
    setDraftContent(savedContent)
    setEditStatus("已還原草稿")
  }

  async function saveDraftToProject() {
    if (!onSaveFile || !canSaveFile || (!draftChanged && !projectDirty) || saveBusy) return

    setSaveBusy(true)
    setSaveError(null)
    try {
      await onSaveFile(file, draftContent)
      setSavedContent(draftContent)
      setProjectDirty(false)
      setEditStatus("已儲存到專案")
      setSelectionPin(null)
      setSelectionLineRange(null)
    } catch (error) {
      setSaveError(getApiErrorMessage(error))
      setEditStatus("儲存失敗")
    } finally {
      setSaveBusy(false)
    }
  }

  async function submitAgentPrompt() {
    const request = prompt.trim()
    if (!request || agentBusy) return
    if (!workspace?.trim()) {
      setAgentError("目前沒有可用的專案 workspace，無法執行 Agent 修改。")
      return
    }
    if (!canRunAgent) {
      setAgentError("檔案內容尚未載入完成，或目前不是可編輯的文字檔案。")
      return
    }

    agentControllerRef.current?.abort()
    const controller = new AbortController()
    agentControllerRef.current = controller
    setAgentBusy(true)
    setAgentError(null)
    setAgentResult(null)
    setResponse("")

    const input = {
      filePath: file.path ?? file.name,
      fileName: file.name,
      fileType: file.type,
      contentType: file.contentType,
      content: agentSourceContent,
      request,
      selectedPins: dialogPins,
      references: [],
    }
    const text = [
      "請使用 file-preview-editor system workflow，先驗證輸入，再產生可由 AppFilePreviewDialog 預覽與確認的完整檔案修改提案。",
      "",
      "File preview edit input JSON:",
      JSON.stringify(input, null, 2),
    ].join("\n")

    try {
      const result = await runWorkflowSystemCommand(FILE_PREVIEW_EDITOR_WORKFLOW_ID, text, controller.signal, workspace)
      if (controller.signal.aborted) return

      const parsed = parseFilePreviewEditResult(result.text)
      if (!parsed) {
        setAgentError("Agent 回應不是可解析的檔案修改 JSON，請稍後重試。")
        return
      }
      if (parsed.filePath !== input.filePath) {
        setAgentError("Agent 回應的檔案路徑與目前預覽不一致，已拒絕套用。")
        return
      }

      setAgentResult(parsed)
      setResponse(parsed.summary)
      if (parsed.ok) setPrompt("")
    } catch (error) {
      if (!controller.signal.aborted) setAgentError(getApiErrorMessage(error))
    } finally {
      if (!controller.signal.aborted) setAgentBusy(false)
    }
  }

  function applyAgentSuggestion() {
    if (!agentResult?.ok) return
    setDraftContent(agentResult.proposedContent)
    setEditStatus("Agent 建議已加入草稿")
    setActiveTab("edit")
  }

  function updateSelectionPin() {
    const selection = window.getSelection()
    const codePreview = previewCodeRef.current
    const previewSection = previewSectionRef.current

    if (!selection || selection.isCollapsed || !selection.rangeCount || !codePreview || !previewSection) {
      setSelectionPin(null)
      setSelectionLineRange(null)
      return
    }

    const range = selection.getRangeAt(0)
    if (!codePreview.contains(range.commonAncestorContainer)) {
      setSelectionPin(null)
      setSelectionLineRange(null)
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      setSelectionPin(null)
      setSelectionLineRange(null)
      return
    }

    const lineElements = Array.from(codePreview.querySelectorAll<HTMLElement>("[data-line]"))
    const startLine = lineElements.find((element) => element.contains(range.startContainer))?.dataset.line ?? "1"
    const endLine = lineElements.find((element) => element.contains(range.endContainer))?.dataset.line ?? startLine
    const startLineNumber = Number.parseInt(startLine, 10)
    const endLineNumber = Number.parseInt(endLine, 10)
    const normalizedStartLine = Number.isNaN(startLineNumber) ? 1 : startLineNumber
    const normalizedEndLine = Number.isNaN(endLineNumber) ? normalizedStartLine : endLineNumber
    const lineLabel = startLine === endLine ? `L${startLine}` : `L${startLine}-${endLine}`
    const rangeRect = range.getBoundingClientRect()
    const sectionRect = previewSection.getBoundingClientRect()

    setSelectionPin({
      label: file.name,
      meta: lineLabel,
      text: summarizeText(text, 180),
      left: Math.max(8, Math.min(rangeRect.left - sectionRect.left, sectionRect.width - 156)),
      top: Math.max(42, rangeRect.top - sectionRect.top - 38),
    })
    setSelectionLineRange({
      start: Math.min(normalizedStartLine, normalizedEndLine),
      end: Math.max(normalizedStartLine, normalizedEndLine),
    })
  }

  useEffect(() => {
    if (!attachMenuOpen) return

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node | null
      if (!attachMenuRef.current || !target) return

      if (!attachMenuRef.current.contains(target)) {
        setAttachMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [attachMenuOpen])

  useEffect(() => () => agentControllerRef.current?.abort(), [])

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogPopup className="max-h-[min(92dvh,860px)] max-w-[1080px] overflow-hidden" closeProps={{ "aria-label": "關閉檔案預覽" }}>
        <DialogHeader className="border-border/70 border-b bg-background pb-3">
          <div className="flex min-w-0 items-start gap-3 pr-10">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/35 text-muted-foreground">
              <FileIcon aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-lg">{file.name}</DialogTitle>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 font-mono text-muted-foreground text-xs">
                <span className="truncate">./{file.name}</span>
                <span aria-hidden="true">·</span>
                <span>{metadataText}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <DialogPanel className="bg-background p-4 sm:p-5">
          <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <section
              aria-label="檔案內容預覽"
              className="relative grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border bg-[#1f1f1f] text-[#d4d4d4] shadow-sm/5"
              onKeyUp={updateSelectionPin}
              onMouseUp={updateSelectionPin}
              ref={previewSectionRef}
            >
              <div className="flex min-h-10 items-center justify-between gap-3 border-white/10 border-b bg-[#252526] px-4 py-2 text-white/70">
                <div className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-[#ffbd2e]" />
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 min-w-0 truncate font-mono text-xs">./{file.name}</span>
                </div>
                <span className="hidden text-white/45 text-xs sm:inline-flex">選取文字可指定給 Agent</span>
              </div>

              {selectionPin && (
                <button
                  className="absolute z-10 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 font-medium text-primary-foreground text-xs shadow-[0_4px_20px_rgb(0_0_0_/_28%)] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    const nextPin = {
                      label: selectionPin.label,
                      meta: selectionPin.meta,
                      text: selectionPin.text,
                    }

                    setDialogPins((current) => {
                      const alreadyPinned = current.some((pin) => pin.meta === nextPin.meta && pin.text === nextPin.text)
                      return alreadyPinned ? current : [...current, nextPin]
                    })
                    setSelectionPin(null)
                    setSelectionLineRange(null)
                    setActiveTab("agent")
                    window.getSelection()?.removeAllRanges()
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  style={{ left: selectionPin.left, top: selectionPin.top }}
                  type="button"
                >
                  <PinIcon aria-hidden="true" className="size-3.5" />
                  Pin 到 Agent
                </button>
              )}

              {isLoadingContent ? (
                <div className="grid min-h-72 gap-3 overflow-hidden p-4">
                  <div className="mb-1 flex items-center gap-3 border-b border-white/10 pb-3">
                    <Skeleton className="h-4 w-24 bg-white/20" />
                    <Skeleton className="h-4 w-16 bg-white/20" />
                  </div>

                  {Array.from({ length: 28 }).map((_, index) => {
                    const widthClass =
                      index % 4 === 0
                        ? "w-[92%]"
                        : index % 4 === 1
                          ? "w-[78%]"
                          : index % 4 === 2
                            ? "w-[84%]"
                            : "w-[72%]"

                    return <Skeleton key={`preview-skeleton-${index}`} className={`${widthClass} h-4 bg-white/20`} />
                  })}
                </div>
              ) : hasContentError ? (
                <pre className="h-[min(62vh,560px)] min-h-72 overflow-auto rounded-none border border-destructive/60 bg-destructive/10 p-4 font-mono text-[#fca5a5] text-xs leading-6">
                  {file.contentError}
                </pre>
              ) : file.type === "img" ? (
                <div className="grid min-h-72 place-items-center gap-2 p-6 text-center text-sm text-white/70">
                  <FileIcon aria-hidden="true" className="size-9 opacity-50" />
                  <span>圖片預覽：{file.name}</span>
                </div>
              ) : file.contentType === "binary" ? (
                <div className="grid min-h-72 place-items-center gap-2 p-6 text-center text-sm text-white/70">
                  <FileIcon aria-hidden="true" className="size-9 opacity-50" />
                  <span>目前為二進位檔案，無法以純文字方式預覽。</span>
                </div>
              ) : (
                <pre
                  className="h-[min(62vh,560px)] min-h-72 overflow-auto p-4 font-mono text-xs leading-6 selection:bg-sky-400/55 selection:text-white"
                  onScroll={() => {
                    setSelectionPin(null)
                    setSelectionLineRange(null)
                  }}
                  ref={previewCodeRef}
                >
                  {lines.map((line, index) => {
                    const lineNumber = index + 1
                    const isLineSelected =
                      selectionLineRange !== null &&
                      lineNumber >= selectionLineRange.start &&
                      lineNumber <= selectionLineRange.end

                    return (
                      <span
                        className={cn(
                          "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-sm border border-transparent hover:bg-white/[0.03]",
                          isLineSelected ? "border-sky-300/35 bg-sky-400/15" : "",
                        )}
                        data-line={index + 1}
                        key={`${file.id}-${index}`}
                      >
                        <span className={cn("select-none text-right", isLineSelected ? "text-sky-200" : "text-white/30")}>{lineNumber}</span>
                        <span className={cn("whitespace-pre-wrap break-all", isLineSelected && "text-white")}>{line || " "}</span>
                      </span>
                    )
                  })}
                </pre>
              )}
            </section>

            <Tabs className="min-h-0 rounded-lg border bg-muted/25 p-3" onValueChange={(value) => setActiveTab(value as WorkTab)} value={activeTab}>
              <TabsList className="w-full">
                <TabsTab className="flex-1" value="agent">
                  <BotIcon aria-hidden="true" />
                  Agent 修改
                </TabsTab>
                <TabsTab className="flex-1" value="edit">
                  <PenLineIcon aria-hidden="true" />
                  手動編輯
                </TabsTab>
              </TabsList>

              <TabsPanel className="min-h-0 pt-2" value="agent">
                <section aria-label="使用 Agent 修改檔案" className="grid gap-4">
                  {response && (
                    <div
                      aria-live="polite"
                      className={cn(
                        "grid gap-3 rounded-lg border p-3 text-sm leading-6",
                        agentResult?.ok ? "border-info/20 bg-info/5" : "border-warning/30 bg-warning/8",
                      )}
                      role={agentResult?.ok ? "status" : "alert"}
                    >
                      <div className="flex items-center gap-2 font-semibold text-info-foreground">
                        <Code2Icon aria-hidden="true" className="size-4" />
                        {agentResult?.ok ? "建議修改" : "Agent 無法產生修改提案"}
                      </div>
                      <p>{response}</p>
                      {agentResult && agentResult.warnings.length > 0 && (
                        <ul className="grid gap-1 text-muted-foreground text-xs">
                          {agentResult.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                        </ul>
                      )}
                      {agentResult?.ok && (
                        <div>
                          <Button disabled={agentBusy} onClick={applyAgentSuggestion} size="sm" variant="outline">
                            <PenLineIcon aria-hidden="true" />
                            套用到編輯草稿
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {agentError && (
                    <div aria-live="assertive" className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">
                      {agentError}
                    </div>
                  )}

                  {agentBusy && (
                    <div aria-live="polite" className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-muted-foreground text-xs" role="status">
                      <CircleDashedIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                      Coordinator 正在整理檔案上下文，完成後會委派 File Preview Editor。
                    </div>
                  )}

                  <div className="grid gap-2">
                    <label className="font-semibold text-sm" htmlFor="fileAgentPrompt">
                      修改指令
                    </label>
                    <div className="rounded-lg border bg-background transition focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring">
                      {dialogPins.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
                          {dialogPins.map((pin, index) => (
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted px-2 py-1 text-xs" key={`${pin.meta}-${index}-${pin.text}`} title={pin.text}>
                              <PinIcon aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 truncate font-semibold">{pin.label}</span>
                              <span className="shrink-0 font-mono text-muted-foreground text-[10px]">{pin.meta}</span>
                              <button
                                aria-label={`移除 Agent 選取範圍 ${pin.meta}`}
                                className="-mr-1 grid size-5 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() => setDialogPins((current) => current.filter((_, pinIndex) => pinIndex !== index))}
                                type="button"
                              >
                                <XIcon aria-hidden="true" className="size-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <textarea
                        aria-label={`請 Agent 修改 ${file.name}`}
                        className={cn(
                          "min-h-[124px] max-h-[240px] w-full resize-none overflow-auto border-0 bg-transparent px-4 pb-3 text-sm leading-6 outline-none placeholder:text-muted-foreground/70",
                          dialogPins.length > 0 ? "pt-2" : "pt-3",
                        )}
                        disabled={agentBusy}
                        id="fileAgentPrompt"
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="例如：找出這份檔案可改善的地方，並直接給出可套用的修改。"
                        rows={5}
                        value={prompt}
                      />
                    </div>
                  </div>

                  <div className="relative flex flex-wrap items-center justify-between gap-3 border-border/70 border-t pt-3" ref={attachMenuRef}>
                    <Button disabled={agentBusy} onClick={() => setAttachMenuOpen((current) => !current)} size="sm" variant="outline">
                      <PaperclipIcon aria-hidden="true" />
                      附加參考
                    </Button>

                    <Button disabled={!prompt.trim() || !canRunAgent} loading={agentBusy} onClick={() => void submitAgentPrompt()} size="sm">
                      {agentBusy ? "正在執行修改" : "執行修改"}
                      <SendIcon aria-hidden="true" />
                    </Button>

                    {attachMenuOpen && (
                      <div className="absolute bottom-full left-0 z-20 mb-2 grid w-[234px] gap-1 rounded-lg border bg-popover p-1.5 text-left text-sm text-popover-foreground shadow-[0_16px_44px_rgb(0_0_0_/_18%)]">
                        <button
                          className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          disabled={agentBusy}
                          onClick={handleLibraryUpload}
                          type="button"
                        >
                          <UploadIcon aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                          <span className="grid min-w-0 gap-0.5 leading-none">
                            <strong className="truncate font-semibold leading-5">從檔案庫選取</strong>
                            <span className="text-muted-foreground text-xs leading-5">引用專案其他檔案作為參考。</span>
                          </span>
                        </button>
                        <button
                          className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          disabled={agentBusy}
                          onClick={handleLocalUpload}
                          type="button"
                        >
                          <PaperclipIcon aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                          <span className="grid min-w-0 gap-0.5 leading-none">
                            <strong className="truncate font-semibold leading-5">上傳本機檔案</strong>
                            <span className="text-muted-foreground text-xs leading-5">加入額外文件或截圖。</span>
                          </span>
                        </button>
                      </div>
                    )}

                    <input
                      accept="*/*"
                      className="sr-only"
                      onChange={handleLocalUploadChange}
                      ref={fileInputRef}
                      type="file"
                    />
                  </div>
                </section>
              </TabsPanel>

              <TabsPanel className="min-h-0 pt-2" value="edit">
                <section aria-label="手動編輯檔案" className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">直接修改內容</h3>
                      <p className="mt-1 text-muted-foreground text-xs">套用後會同步更新左側預覽。</p>
                    </div>
                    <span className={cn("rounded-md px-2 py-1 text-xs", draftChanged ? "bg-warning/10 text-warning-foreground" : "bg-success/10 text-success-foreground")}>
                      {draftChanged ? "尚未套用" : projectDirty ? "預覽尚未儲存" : editStatus}
                    </span>
                  </div>

                  <textarea
                    aria-label={`手動編輯 ${file.name}`}
                    className="h-[min(52vh,460px)] min-h-72 w-full resize-none overflow-auto rounded-lg border bg-background px-4 py-3 font-mono text-sm leading-6 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-ring"
                    onChange={(event) => {
                      setDraftContent(event.target.value)
                      setEditStatus("草稿修改中")
                    }}
                    spellCheck={false}
                    value={draftContent}
                  />

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button disabled={!draftChanged} onClick={resetDraft} size="sm" variant="outline">
                      <RotateCcwIcon aria-hidden="true" />
                      還原
                    </Button>
                    <Button disabled={!draftChanged} onClick={saveDraft} size="sm">
                      <CheckIcon aria-hidden="true" />
                      套用到預覽
                    </Button>
                    <Button disabled={!canSaveFile || (!draftChanged && !projectDirty)} loading={saveBusy} onClick={() => void saveDraftToProject()} size="sm">
                      <SaveIcon aria-hidden="true" />
                      {saveBusy ? "儲存中" : "儲存到專案"}
                    </Button>
                  </div>
                  {saveError && (
                    <div aria-live="assertive" className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">
                      {saveError}
                    </div>
                  )}
                </section>
              </TabsPanel>
            </Tabs>
          </div>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  )
}
